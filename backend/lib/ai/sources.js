/* 來源清單：只保留後端產生的合法 http／https URL，最多 3 個。 */

const WEATHER_SOURCE = { title: "Open-Meteo 天氣", url: "https://open-meteo.com/" };
const MARINE_SOURCE = {
  title: "Open-Meteo 海況",
  url: "https://open-meteo.com/en/docs/marine-weather-api"
};
const TIDE_SOURCE = {
  title: "中央氣象署潮汐預報",
  url: "https://www.cwa.gov.tw/V8/C/M/tide.html"
};

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
  const rows = [];
  if (local.mode === "sea") {
    if (local.marine) rows.push(MARINE_SOURCE);
    if (local.weather) rows.push(WEATHER_SOURCE);
    if (local.tide) rows.push(TIDE_SOURCE);
  } else if (local.weather) {
    rows.push(WEATHER_SOURCE);
  }
  return safeSources(rows);
}

module.exports = {
  safeSources: safeSources,
  sourcesOf: sourcesOf,
  localSources: localSources
};
