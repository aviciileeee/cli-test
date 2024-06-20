const childProcess = require("child_process");

function isObject(obj) {
  return Object.prototype.toString(obj) === "[object Object]";
}

function spinnerStart(message = "loading") {
  const Spinner = require("cli-spinner").Spinner;
  const spinner = new Spinner(`${message}... %s`);
  spinner.setSpinnerString("|/-\\");
  spinner.start();
  return function () {
    spinner.stop(true);
  };
}

function execCmd(command, args, options) {
  const win32 = process.platform === "win32";
  const cmd = win32 ? "cmd" : command;
  const cmdArgs = win32 ? ["/c"].concat(command, args) : args;
  return childProcess.spawn(cmd, cmdArgs, options || {});
}

function execCmdAsync(command, args, options) {
  return new Promise((resolve, rejected) => {
    const child = execCmd(command, args, options);
    child.on("error", (e) => {
      rejected(e);
    });
    child.on("exit", (c) => {
      resolve(c);
    });
  });
}

module.exports = {
  isObject,
  spinnerStart,
  execCmd,
  execCmdAsync,
};
