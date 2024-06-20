const path = require("path");
const { isObject } = require("@cli-test/utils");
const formatPath = require("@cli-test/format-path");
const {
  getDefaultRegistry,
  getNpmLatestVersion,
} = require("@cli-test/get-npm-info");
const logger = require("@cli-test/log");
const pkgDir = require("pkg-dir");
const pathExists = require("path-exists").sync;
const npmInstall = require("npminstall");
const fse = require("fs-extra");
const semver = require("semver");
class Package {
  constructor(options) {
    if (!options || !isObject(options)) {
      throw new Error("Package类的初始化参数不能为空");
    }
    const { targetPath, packageName, storePath, packageVersion } = options;
    this.targetPath = targetPath;
    this.storePath = storePath;
    this.packageName = packageName;
    this.packageVersion = packageVersion;
  }

  get cacheFilePath() {
    return path.resolve(this.storePath, `${this.packageName}`);
  }

  async prepare() {
    if (this.storePath && !pathExists(this.storePath)) {
      fse.mkdirpSync(this.storePath);
    }
    if (this.packageVersion === "latest") {
      this.packageVersion = await getNpmLatestVersion(this.packageName);
    }
  }

  async exists() {
    if (this.storePath) {
      await this.prepare();
      return pathExists(this.cacheFilePath);
    } else {
      // 执行本地命令的时候
      return pathExists(this.targetPath);
    }
  }

  async install() {
    await this.prepare();
    await npmInstall({
      root: this.targetPath,
      storeDir: this.storePath,
      registry: getDefaultRegistry(),
      pkgs: [
        {
          name: this.packageName,
          version: this.packageVersion,
        },
      ],
    });
  }

  async update() {
    await this.prepare();
    const latestVersion = await getNpmLatestVersion(this.packageName);
    const cacheVersion = this.getCachePackageVersion();
    if (semver.gt(latestVersion, cacheVersion)) {
      await npmInstall({
        root: this.targetPath,
        storeDir: this.storePath,
        registry: getDefaultRegistry(),
        pkgs: [
          {
            name: this.packageName,
            version: latestVersion,
          },
        ],
      });
      this.packageVersion = latestVersion;
      return true;
    }
    return false;
  }

  getCachePackageVersion() {
    const packageDir = pkgDir.sync(this.cacheFilePath);
    if (!packageDir) return null;
    const commandPkg = require(path.join(packageDir, "package.json"));
    return commandPkg.version;
  }

  getRootFilePath() {
    const _this = this;
    function _getRootFile(targetPath) {
      const packageDir = pkgDir.sync(targetPath);
      if (!packageDir) return null;
      const commandPkg = require(path.join(packageDir, "package.json"));
      if (commandPkg.name === _this.packageName && commandPkg.main) {
        return formatPath(path.join(packageDir, commandPkg.main));
      }
    }
    if (this.storePath) {
      return _getRootFile(this.cacheFilePath);
    } else {
      return _getRootFile(this.targetPath);
    }
  }
}

module.exports = Package;
