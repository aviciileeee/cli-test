const path = require("path");
const os = require("os");
const Command = require("@cli-test/command");
const logger = require("@cli-test/log");
const Package = require("@cli-test/package");
const { spinnerStart, execCmdAsync } = require("@cli-test/utils");
const fs = require("fs");
const fse = require("fs-extra");
const inquirer = require("inquirer");
const semver = require("semver");
const getProjectTemplate = require("./api/getProjectTemplate");
const { glob } = require("glob");
const ejs = require("ejs");
const TYPE_PROJECT = "project";
const TYPE_COMPONENT = "component";
const TEMPLATE_TYPE_NORMAL = "normal";
const TEMPLATE_TYPE_CUSTOM = "custom";
const WHITE_COMMANDS = ["npm", "pnpm"];

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || "";
    this.force = this._argv[this._argv.length - 1].force;
    if (this.projectName && !this.isProjectNameValid(this.projectName)) {
      throw new Error("请输入合法的名称");
    }
    logger.verbose("[init command param] projectName: ", this.projectName);
    logger.verbose("[init command param] force: ", this.force);
  }

  async exec() {
    try {
      const projectInfo = await this.prepare();
      if (projectInfo) {
        // 下载模版
        logger.verbose("[input project info]", projectInfo);
        this.projectInfo = projectInfo;
        await this.downloadTemplate();
        // 安装模版
        await this.installTemplate();
      }
    } catch (error) {
      logger.error(error.message);
    }
  }

  async downloadTemplate() {
    const { projectTemplate } = this.projectInfo;
    const templateInfo = this.templates.find(
      (item) => item.npmName === projectTemplate
    );
    const userHome = os.homedir();
    const targetPath = path.resolve(userHome, ".cli-test", "template");
    const storePath = path.resolve(targetPath, "node_modules");
    const { npmName, version } = templateInfo;
    this.templateInfo = templateInfo;
    const templateNpm = new Package({
      targetPath,
      storePath,
      packageName: npmName,
      packageVersion: version,
    });
    if (!(await templateNpm.exists())) {
      const stop = spinnerStart("正在加载模版");
      try {
        await templateNpm.install();
        stop();
        logger.success("模版下载成功");
      } catch (error) {
        stop();
        throw error;
      }
    } else {
      const stop = spinnerStart("正在更新模版");
      try {
        const success = await templateNpm.update();
        stop();
        if (success) {
          logger.success("模版更新成功");
        }
      } catch (error) {
        stop();
        throw error;
      }
    }
    this.templateNpm = templateNpm;
  }

  async installTemplate() {
    if (this.templateInfo) {
      if (!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
      }
      if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
        await this.installNormalTemplate();
      } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
        await this.installCustomTemplate();
      } else {
        throw new Error("项目模版类型无法识别");
      }
    } else {
      throw new Error("项目模版信息不存在");
    }
  }

  async installNormalTemplate() {
    try {
      const templatePath = path.resolve(
        this.templateNpm.cacheFilePath,
        "template"
      );
      const targetPath = process.cwd();
      fse.ensureDirSync(templatePath);
      fse.ensureDirSync(targetPath);
      const stop = spinnerStart("开始生成项目");
      fse.copySync(templatePath, targetPath);
      stop();
      logger.success("模版生成成功");
      // 依赖安装
      const { installCommand, startCommand } = this.templateInfo;
      const ignore = ["node_modules/**", "public/**"];
      await this.ejsRender(ignore);
      await this.execCommand(
        installCommand,
        `安装命令不合法, 可以使用的安装命令为: ${WHITE_COMMANDS.join(",")}`
      );
      await this.execCommand(
        startCommand,
        `执行命令不合法, 可以使用的执行命令为: ${WHITE_COMMANDS.join(",")}`
      );
    } catch (error) {
      throw error;
    }
  }

  async execCommand(command, message) {
    if (command) {
      const [cmd, ...args] = command.split(" ");
      // 启动命令执行
      if (!this.checkCommand(cmd)) {
        throw new Error(`${message}`);
      }
      await execCmdAsync(cmd, [...args], {
        cwd: process.cwd(),
        stdio: "inherit",
      });
    }
  }

  async installCustomTemplate() {}

  async ejsRender(ignore) {
    const dir = process.cwd();
    const files = await glob("**", {
      cwd: dir,
      ignore,
      nodir: true,
    });
    return Promise.all(
      files.map((file) => {
        const filePath = path.join(dir, file);
        return new Promise((resolve1, reject1) => {
          ejs.renderFile(filePath, this.projectInfo, (err, result) => {
            if (err) {
              reject1(err);
            } else {
              fse.writeFileSync(filePath, result);
              resolve1(result);
            }
          });
        });
      })
    );
  }

  checkCommand(cmd) {
    if (WHITE_COMMANDS.includes(cmd)) {
      return true;
    }
    return false;
  }

  async prepare() {
    // 判断项目模版是否存在
    const templates = await getProjectTemplate();
    if (!templates || templates.length <= 0) {
      throw new Error("项目模版不存在");
    }
    this.templates = templates;
    const localPath = process.cwd();
    // 判断当前目录是否为空
    if (!this.isDirEmpty(localPath)) {
      let ifContinue = false;
      if (!this.force) {
        ifContinue = (
          await inquirer.prompt([
            {
              type: "confirm",
              name: "ifContinue",
              message: "当前文件夹不为空,是否继续创建项目?",
            },
          ])
        ).ifContinue;
        if (!ifContinue) {
          return;
        }
      }
      if (ifContinue || this.force) {
        const { confirmDelete } = await inquirer.prompt([
          {
            type: "confirm",
            name: "confirmDelete",
            message: `是否确认删除${localPath}下的所有文件?`,
          },
        ]);
        if (confirmDelete) {
          fse.emptyDirSync(localPath);
        }
      }
    }
    return this.getProjectInfo();
  }

  async getProjectInfo() {
    let projectInfo = {};
    const { type } = await inquirer.prompt({
      type: "list",
      name: "type",
      message: "请选择初始化类型:",
      default: TYPE_PROJECT,
      choices: [
        {
          name: "项目",
          value: TYPE_PROJECT,
        },
        {
          name: "组件",
          value: TYPE_COMPONENT,
        },
      ],
    });
    const title = type === TYPE_COMPONENT ? "组件" : "项目";
    logger.verbose("project type: ", type);
    this.templates = this.templates.filter((template) =>
      template.tag.includes(type)
    );
    const prompts = [
      {
        type: "input",
        name: "projectVersion",
        message: `请输入${title}版本号:`,
        default: "1.0.0",
        validate: function (v) {
          const done = this.async();
          if (!!semver.valid(v)) {
            done(null, true);
          } else {
            done("请输入合法的版本号");
            return;
          }
        },
        filter: function (v) {
          if (!!semver.valid(v)) {
            return semver.valid(v);
          } else {
            return v;
          }
        },
      },
      {
        type: "list",
        name: "projectTemplate",
        message: `请选择${title}模版:`,
        choices: this.createTemplateChoice(),
      },
    ];
    if (!this.projectName) {
      const _this = this;
      prompts.unshift({
        type: "input",
        name: "projectName",
        message: `请输入${title}名称:`,
        default: "",
        validate: function (v) {
          const done = this.async();
          setTimeout(() => {
            if (!_this.isProjectNameValid(v)) {
              done(`请输入合法的${title}名称:`);
              return;
            } else {
              done(null, true);
            }
          }, 0);
        },
        filter: function (v) {
          return v;
        },
      });
    }
    if (type === TYPE_PROJECT) {
      const project = await inquirer.prompt(prompts);
      projectInfo = {
        type,
        ...project,
      };
    } else if (type === TYPE_COMPONENT) {
      const descriptionPrompt = {
        type: "input",
        name: "componentDescription",
        message: "请输入组件描述信息:",
        validate: function (v) {
          const done = this.async();
          setTimeout(() => {
            if (!v) {
              done("请输入组件描述信息");
              return;
            } else {
              done(null, true);
            }
          }, 0);
        },
      };
      prompts.push(descriptionPrompt);
      const component = await inquirer.prompt(prompts);
      projectInfo = {
        type,
        ...component,
      };
    }
    // 处理ejs注入信息
    projectInfo.projectName = projectInfo.projectName || this.projectName;
    if (projectInfo.projectName) {
      projectInfo.className = require("kebab-case")(
        projectInfo.projectName
      ).replace(/^-/, "");
    }
    if (projectInfo.projectVersion) {
      projectInfo.version = projectInfo.projectVersion;
    }
    if (projectInfo.componentDescription) {
      projectInfo.description = projectInfo.componentDescription;
    }
    return projectInfo;
  }

  isProjectNameValid(v) {
    return /^[a-zA-Z]+[\w-]*[a-zA-Z0-9]$/.test(v);
  }

  createTemplateChoice() {
    return this.templates.map((item) => ({
      value: item.npmName,
      name: item.name,
    }));
  }

  isDirEmpty(localPath) {
    const fileList = fs.readdirSync(localPath);
    return !(fileList && fileList.length > 0);
  }
}

function init(argv) {
  new InitCommand(argv);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
