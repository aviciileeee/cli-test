function isObject(obj) {
  return Object.prototype.toString(obj) === "[object Object]";
}

module.exports = {
  isObject,
};
