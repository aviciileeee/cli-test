const semver = require("semver");
const colors = require("colors/safe");
const logger = require("@cli-test/log");
const LOWEST_NODE_VERSION = "12.0.0";

class Command {
  constructor(argv) {
    if (!argv) {
      throw new Error("参数不能为空");
    }
    if (!Array.isArray(argv)) {
      throw new Error("必须是对象");
    }
    if (argv.length < 1) {
      throw new Error("参数列表不能为空");
    }
    this._argv = argv;
    let runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve();
      chain = chain.then(() => this._checkNodeVersion());
      chain = chain.then(() => this.initArgs());
      chain = chain.then(() => this.init());
      chain = chain.then(() => this.exec());
      chain.catch((error) => {
        logger.error(error.message);
      });
    });
  }

  initArgs() {
    this._cmd = this._argv[this._argv.length - 1];
    this._argv = this._argv.slice(0, this._argv.length - 1);
  }

  /**
   * 检查Node版本
   */
  _checkNodeVersion() {
    const currentVersion = process.version;
    const lowestVersion = LOWEST_NODE_VERSION;
    if (!semver.gte(currentVersion, lowestVersion)) {
      throw new Error(
        colors.red(`cli 需要安装${LOWEST_NODE_VERSION}以上版本的Node.js`)
      );
    }
  }

  init() {
    throw new Error("init必须实现");
  }

  exec() {
    throw new Error("exec必须实现");
  }
}

module.exports = Command;
