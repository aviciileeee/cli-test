const path = require("path");
const Package = require("@cli-test/package");
const logger = require("@cli-test/log");
const { execCmd } = require("@cli-test/utils");

const SETTINGS = {
  init: "@cli-test/init",
};

const CACHE_DIR = "dependencies";

async function exec() {
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

    if (await pkg.exists()) {
      // 更新pkg
      await pkg.update();
    } else {
      // 安装pkg
      await pkg.install();
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
  if (rootFile) {
    try {
      // require(rootFile).apply(this, arguments);
      const args = Array.from(arguments);
      const cmd = args[args.length - 1];
      const o = Object.create(null);
      Object.keys(cmd).forEach((key) => {
        if (
          cmd.hasOwnProperty(key) &&
          !key.startsWith("_") &&
          key !== "parent"
        ) {
          o[key] = cmd[key];
        }
      });
      args[args.length - 1] = o;
      const code = `require('${rootFile}').call(null, ${JSON.stringify(args)})`;
      const child = execCmd("node", ["-e", code], {
        cwd: process.cwd(),
        stdio: "inherit",
      });
      child.on("error", (e) => {
        logger.error(e.message);
        process.exit(1);
      });
      child.on("exit", (e) => {
        logger.info("命令执行完成");
        process.exit(e);
      });
    } catch (error) {
      if (process.env.LOG_LEVEL === "verbose") {
        console.log(error);
      }
      logger.error(error.message);
    }
  }
}

// function spawn(command, args, options) {
//   const win32 = process.platform === "win32";
//   const cmd = win32 ? "cmd" : command;
//   const cmdArgs = win32 ? ["/c"].concat(command, args) : args;
//   return childProcess.spawn(cmd, cmdArgs, options || {});
// }

module.exports = exec;
