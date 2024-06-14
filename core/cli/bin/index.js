#! /usr/bin/env node

const importLocal = require("import-local");
const logger = require("@cli-test/log");

if (importLocal(__filename)) {
  logger.success("cli", "正在使用cli-test本地版本");
} else {
  require("../lib")(process.argv.slice(2));
}
