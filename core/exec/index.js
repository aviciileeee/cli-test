const path = require("path");
const Package = require("@cli-test/package");
const logger = require("@cli-test/log");

const SETTINGS = {
  init: "@cli-test/init",
};

const CACHE_DIR = "dependencies";

function exec() {
  let pkg;
  let targetPath = process.env.CLI_TARGET_PATH;
  const homePath = process.env.CLI_HOME_PATH;
  logger.verbose("targetPath: ", targetPath);
  logger.verbose("homePath: ", homePath);
  const cmdObj = arguments[arguments.length - 1];
  const cmdName = cmdObj.name();
  const packageName = SETTINGS[cmdName];
  const packageVersion = "latest";

  // targetPath 不存在表示从npm下载包进行执行, 需要指定缓存目录
  if (!targetPath) {
    targetPath = path.resolve(homePath, CACHE_DIR);
    const storePath = path.resolve(targetPath, "node_modules");
    logger.verbose("targetPath", targetPath);
    logger.verbose("storePath", storePath);
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
      storePath,
    });

    if (pkg.exists()) {
      // 更新pkg
      pkg.update();
    } else {
      // 安装pkg
      pkg.install();
    }
  } else {
    // 构建本地命令的pkg
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
    });
  }
  const rootFile = pkg.getRootFilePath();
  require(rootFile).apply(this, arguments);
}

module.exports = exec;
