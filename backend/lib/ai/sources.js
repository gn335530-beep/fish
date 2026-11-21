/* 來源清單：只保留後端產生的合法 http／https URL，最多 3 個。 */

const { localSourceRows } = require("../conditions/sources");

const NO_SOURCE_TEXT = "目前沒有可提供的來源。";

function safeSources(rows) {
  const seen = {};
  return (Array.isArray(rows) ? rows : []).map(function (row) {
    let url;
    try {
      url = new URL(String(row && row.url || ""));
    } catch (error) {
      return null;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (seen[url.toString()]) return null;
    seen[url.toString()] = true;
    return {
      title: String(row.title || url.hostname).slice(0, 200),
      url: url.toString()
    };
  }).filter(Boolean).slice(0, 3);
}

function sourcesOf(results) {
  return safeSources((results || []).map(function (row) {
    return { title: row.title, url: row.url };
  }));
}

function localSources(local) {
  if (!local || local.found !== true) return [];
  return safeSources(local.sources || localSourceRows(local));
}

module.exports = {
  NO_SOURCE_TEXT: NO_SOURCE_TEXT,
  safeSources: safeSources,
  sourcesOf: sourcesOf,
  localSources: localSources
};
