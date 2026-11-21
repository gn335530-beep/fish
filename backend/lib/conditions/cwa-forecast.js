/* 中央氣象署 F-D0047-091 一週天氣預報：以縣市名稱查詢，正規化見 summary。 */

const { fetchJson, reasonError, createFetcher } = require("./fetch-json");
const { summarize } = require("./cwa-forecast-summary");
const { normalizeArea } = require("../regions");

const API_URL = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-091";
const ELEMENT_NAME = "平均溫度,最高溫度,最低溫度,12小時降雨機率,風向,風速,天氣現象";
/* CWA 查詢參數使用「臺」，平台內部統一用「台」；本地比對仍會正規化。 */
const CWA_CITY_NAME = {
  "台北市": "臺北市",
  "台中市": "臺中市",
  "台南市": "臺南市",
  "台東縣": "臺東縣"
};

const fetcherSlot = createFetcher();

function cwaCityName(city) {
  const normalized = normalizeArea(city);
  return CWA_CITY_NAME[normalized] || normalized;
}

function forecastUrl(city, apiKey) {
  const params = new URLSearchParams({
    Authorization: apiKey,
    format: "JSON",
    LocationName: cwaCityName(city),
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
    fetcher: fetcherSlot.current()
  });
  const location = pickLocation(payload, city);
  if (!location) throw reasonError("NO_DATA");
  return summarize(location, settings.at);
}

module.exports = {
  forecastFor: forecastFor,
  setFetcher: fetcherSlot.set,
  resetFetcher: fetcherSlot.reset
};
