const axios = require("axios");
const urlJoin = require("url-join");
const semver = require("semver");

async function getNpmInfo(npmName, registry) {
  if (!npmName) return null;
  const registryUrl = registry || getDefaultRegistry(false);
  const npmInfoUrl = urlJoin(registryUrl, npmName);
  const result = await axios.get(npmInfoUrl);
  if (result.status === 200) {
    return result.data;
  }
  return null;
}

async function getNpmVersions(npmName, registry) {
  const npmInfo = await getNpmInfo(npmName, registry);
  if (npmInfo) {
    return Object.keys(npmInfo.versions);
  }
  return [];
}

function _getNpmSemverVersions(baseVersion, versions) {
  return versions
    .filter((version) => {
      return semver.satisfies(version, `^${baseVersion}`);
    })
    .sort((a, b) => {
      return semver.gt(b, a);
    });
}

async function getNpmSemverVersion(npmName, registry, baseVersion) {
  const versions = await getNpmVersions(npmName, registry);
  const newVersions = _getNpmSemverVersions(baseVersion, versions);
  if (newVersions && newVersions.length > 0) {
    return newVersions[0];
  } else {
    return null;
  }
}

function getDefaultRegistry(isOrigin = false) {
  return isOrigin ? "https://registry.npmjs.org" : "http://localhost:4873/";
}

async function getNpmLatestVersion(npmName, registry) {
  let versions = await getNpmVersions(npmName, registry);
  if (versions) {
    versions = versions.sort((a, b) => {
      return semver.gt(b, a);
    });
    return versions[0];
  }
  return null;
}

module.exports = {
  getNpmInfo,
  getNpmVersions,
  getNpmSemverVersion,
  getDefaultRegistry,
  getNpmLatestVersion,
};
