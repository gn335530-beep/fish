/* 中央氣象署 F-D0047-091 一週天氣預報：以縣市名稱查詢，正規化見 summary。 */

const { fetchJson, reasonError } = require("./fetch-json");
const { summarize, taipeiDate } = require("./cwa-forecast-summary");
const { normalizeArea } = require("../regions");

const API_URL = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-091";
const ELEMENT_NAME = "平均溫度,最高溫度,最低溫度,12小時降雨機率,風向,風速,天氣現象";

let fetcher = null;

function setFetcher(fake) {
  fetcher = fake;
}

function resetFetcher() {
  fetcher = null;
}

function fetchImpl() {
  return fetcher || fetch;
}

function forecastUrl(city, apiKey) {
  const params = new URLSearchParams({
    Authorization: apiKey,
    format: "JSON",
    LocationName: normalizeArea(city),
    ElementName: ELEMENT_NAME
  });
  return API_URL + "?" + params.toString();
}

function locationsOf(payload) {
  const entries = payload && payload.records &&
    (payload.records.Locations || payload.records.locations);
  if (!Array.isArray(entries)) return [];
  const rows = [];
  entries.forEach(function (entry) {
    const list = entry && (entry.Location || entry.location);
    if (Array.isArray(list)) Array.prototype.push.apply(rows, list);
  });
  return rows;
}

/* 即使上游忽略 LocationName，仍以縣市名稱在本地過濾。 */
function pickLocation(payload, city) {
  const wanted = normalizeArea(city);
  const rows = locationsOf(payload);
  return rows.find(function (row) {
    return normalizeArea(row.LocationName || row.locationName) === wanted;
  }) || rows.find(function (row) {
    return normalizeArea(row.LocationName || row.locationName).indexOf(wanted) === 0;
  }) || null;
}

async function forecastFor(city, options) {
  const settings = options || {};
  if (!settings.apiKey) throw reasonError("NOT_CONFIGURED");
  const payload = await fetchJson(forecastUrl(city, settings.apiKey), {
    timeoutMs: settings.timeoutMs,
    fetcher: fetchImpl()
  });
  const location = pickLocation(payload, city);
  if (!location) throw reasonError("NO_DATA");
  return summarize(location, settings.at);
}

module.exports = {
  forecastFor: forecastFor,
  setFetcher: setFetcher,
  resetFetcher: resetFetcher,
  taipeiDate: taipeiDate
};
