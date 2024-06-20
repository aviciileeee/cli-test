const Command = require("@cli-test/command");
const logger = require("@cli-test/log");
const fs = require("fs");
const fse = require("fs-extra");
const inquirer = require("inquirer");
const semver = require("semver");
const getProjectTemplate = require("./api/getProjectTemplate");

const TYPE_PROJECT = "project";
const TYPE_COMPONENT = "component";
class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || "";
    this.force = this._argv[this._argv.length - 1].force;
    logger.verbose("[init command param] projectName: ", this.projectName);
    logger.verbose("[init command param] force: ", this.force);
  }

  async exec() {
    try {
      const projectInfo = await this.prepare();
      if (projectInfo) {
        logger.verbose("[input project info]", projectInfo);
        this.projectInfo = projectInfo;
        this.downloadTemplate();
      }
    } catch (error) {
      logger.error(error.message);
    }
  }

  downloadTemplate() {
    // console.log(this.projectInfo, this.template);
  }

  async prepare() {
    // 判断项目模版是否存在
    const template = await getProjectTemplate();
    if (!template || template.length <= 0) {
      throw new Error("项目模版不存在");
    }
    this.template = template;
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
    logger.verbose("project type: ", type);
    if (type === TYPE_PROJECT) {
      const project = await inquirer.prompt([
        {
          type: "input",
          name: "projectName",
          message: "请输入项目名称:",
          default: "",
          validate: function (v) {
            const done = this.async();
            setTimeout(() => {
              if (!/^[a-zA-Z]+[\w-]*[a-zA-Z0-9]$/.test(v)) {
                done("请输入合法的项目名称");
                return;
              } else {
                done(null, true);
              }
            }, 0);
          },
          filter: function (v) {
            return v;
          },
        },
        {
          type: "input",
          name: "projectVersion",
          message: "请输入项目版本号:",
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
          message: "请选择项目模版:",
          choices: this.createTemplateChoice(),
        },
      ]);
      projectInfo = {
        type,
        ...project,
      };
    } else if (type === TYPE_COMPONENT) {
    }
    return projectInfo;
  }

  createTemplateChoice() {
    return this.template.map((item) => ({
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
