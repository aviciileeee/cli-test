const request = require("@cli-test/request");

module.exports = function () {
  return request({
    url: "/project/template",
  });
};
