const os = require("os");
const path = require("path");
const pkg = require("../package.json");
const logger = require("@cli-test/log");
// const initCommand = require("@cli-test/init");
const exec = require("@cli-test/exec");
const { getNpmSemverVersion } = require("@cli-test/get-npm-info");
const semver = require("semver");
const colors = require("colors/safe");
const pathExists = require("path-exists").sync;
const commander = require("commander");
const { DEFAULT_CLI_HOME } = require("./const");

const program = new commander.Command();
async function cli() {
  try {
    await prepare();
    registerCommand();
  } catch (error) {
    if (process.env.LOG_LEVEL === "verbose") {
      console.log(error);
    }
    logger.error(error.message);
  }
}

async function prepare() {
  checkPkgVersion();
  checkRoot();
  checkUserHome();
  checkEnv();
  await checkGlobalUpdate();
}

function registerCommand() {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage("<command> [options]")
    .version(pkg.version)
    .option("-d, --debug", "是否开启调试模式", false)
    .option("-tp, --targetPath <targetPath>", "是否指定本地调试文件路径", "");

  program
    .command("init [projectName]")
    .option("-f, --force", "是否强制初始化项目", false)
    .action(exec);

  program.on("option:debug", function () {
    if (this.opts().debug) {
      process.env.LOG_LEVEL = "verbose";
    } else {
      process.env.LOG_LEVEL = "info";
    }
    logger.level = process.env.LOG_LEVEL;
  });

  program.on("command:*", function (obj) {
    const availableCommands = program.commands.map((cmd) => cmd.name());
    logger.warn(colors.red(`未知命令: ${obj[0]}`));
    if (availableCommands.length > 0) {
      logger.warn(colors.red(`可用命令为: ${availableCommands.join(",")}`));
    }
  });

  program.on("option:targetPath", function (val) {
    process.env.CLI_TARGET_PATH = val;
  });

  if (process.argv.length < 3) {
    program.outputHelp();
    console.log();
  } else {
    program.parse(process.argv);
  }
}

/**
 * 检查全局更新
 */
async function checkGlobalUpdate() {
  const currentVersion = pkg.version;
  const npmName = pkg.name;
  const latestVersion = await getNpmSemverVersion(
    npmName,
    null,
    currentVersion
  );
  if (latestVersion && semver.gt(latestVersion, currentVersion)) {
    logger.warn(
      "更新提示:",
      colors.yellow(
        `请手动更新 ${npmName}, 当前版本: ${currentVersion}, 最新版本: ${latestVersion} 更新命令: npm install -g ${npmName}`
      )
    );
  }
}

/**
 * 通过用户目录下的.env文件配置process.env的环境变量
 */
function checkEnv() {
  const dotenv = require("dotenv");
  const dotEnvPath = path.resolve(os.homedir(), ".env");
  if (pathExists(dotEnvPath)) {
    dotenv.config({
      path: dotEnvPath,
    });
  }
  createDefaultCLiHome();
}

function createDefaultCLiHome() {
  const cliConfig = {
    home: os.homedir(),
  };
  cliConfig["cliHome"] = process.env.CLI_HOME
    ? path.join(os.homedir(), process.env.CLI_HOME)
    : path.join(os.homedir(), DEFAULT_CLI_HOME);
  process.env.CLI_HOME_PATH = cliConfig.cliHome;
}

/**
 * 检查用户主目录是否存在
 */
function checkUserHome() {
  const userHomeDir = os.homedir();
  if (!pathExists(userHomeDir)) {
    throw new Error(colors.red(`当前用户主目录不存在`));
  }
}

/**
 * root用户降级
 */
function checkRoot() {
  const rootCheck = require("root-check");
  rootCheck();
}

/**
 * 打印当前包版本
 */
function checkPkgVersion() {
  logger.info("cli-test", pkg.version);
}

module.exports = cli;
