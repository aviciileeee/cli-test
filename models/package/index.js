const path = require("path");
const { isObject } = require("@cli-test/utils");
const formatPath = require("@cli-test/format-path");
const { getDefaultRegistry } = require("@cli-test/get-npm-info");
const pkgDir = require("pkg-dir");
const npmInstall = require("npminstall");

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

  exists() {}

  async install() {
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

  update() {}

  getRootFilePath() {
    const packageDir = pkgDir.sync(this.targetPath);
    const commandPkg = require(path.join(packageDir, "package.json"));
    if (commandPkg.name === this.packageName && commandPkg.main) {
      return formatPath(path.join(packageDir, commandPkg.main));
    }
    return null;
  }
}

module.exports = Package;
