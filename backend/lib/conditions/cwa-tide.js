/* 中央氣象署潮汐預報：讀取 F-A0021-001，整理今日與明日的滿潮、乾潮時間。 */

const { fetchJson, reasonError, createFetcher } = require("./fetch-json");

const API_URL = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-A0021-001";
const TIME_RE = /(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/;

const fetcherSlot = createFetcher();

function taipeiDate(at) {
  const time = Number.isFinite(at) ? at : Date.now();
  return new Date(time + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

function tideUrl(locationName, apiKey) {
  const params = new URLSearchParams({
    Authorization: apiKey,
    format: "JSON",
    locationName: locationName
  });
  return API_URL + "?" + params.toString();
}

/* 新版回應：records.TideForecasts[].Location（單一物件）→ 攤平成陣列。 */
function locationsOf(payload) {
  const groups = payload && payload.records && payload.records.TideForecasts;
  if (!Array.isArray(groups)) return [];
  const rows = [];
  groups.forEach(function (group) {
    const location = group && group.Location;
    if (Array.isArray(location)) Array.prototype.push.apply(rows, location);
    else if (location) rows.push(location);
  });
  return rows;
}

function pickLocation(payload, station) {
  const rows = locationsOf(payload);
  if (!rows.length) return null;
  const wanted = String(station.location || "").replace(/臺/g, "台");
  return rows.find(function (row) {
    const name = String(row.LocationName || "").replace(/臺/g, "台");
    return name === wanted || name.indexOf(wanted) !== -1 || wanted.indexOf(name) !== -1;
  }) || null;
}

function tideType(text) {
  if (String(text || "").indexOf("滿") !== -1) return "high";
  if (String(text || "").indexOf("乾") !== -1) return "low";
  return "";
}

/* 每日 TimePeriods.Daily：Date 為日期，Time[].Tide 為滿潮／乾潮、DateTime 為 ISO。 */
function addDaily(days, daily) {
  const date = String(daily && daily.Date || "");
  if (!date) return;
  (Array.isArray(daily.Time) ? daily.Time : []).forEach(function (item) {
    const type = tideType(item && item.Tide);
    if (!type) return;
    const match = TIME_RE.exec(String(item && item.DateTime || ""));
    if (!match) return;
    const day = days[date] || { date: date, high: [], low: [] };
    day[type].push({ time: match[4] + ":" + match[5] });
    days[date] = day;
  });
}

function summarize(payload, station) {
  const location = pickLocation(payload, station);
  if (!location) throw reasonError("NO_DATA");
  const days = {};
  const daily = location.TimePeriods && location.TimePeriods.Daily;
  (Array.isArray(daily) ? daily : []).forEach(function (row) { addDaily(days, row); });
  const today = days[taipeiDate()] || null;
  const tomorrow = days[taipeiDate(Date.now() + 24 * 3600 * 1000)] || null;
  if (!today || (!today.high.length && !today.low.length)) throw reasonError("NO_DATA");
  function clean(day) {
    if (!day) return null;
    function unique(rows) {
      const seen = {};
      return rows.filter(function (row) {
        if (seen[row.time]) return false;
        seen[row.time] = true;
        return true;
      }).sort(function (a, b) { return a.time.localeCompare(b.time); });
    }
    return {
      date: day.date,
      high: unique(day.high),
      low: unique(day.low)
    };
  }
  return {
    station: station.name,
    location: location.LocationName || station.location,
    station_id: location.LocationId || location.stationId || null,
    today: clean(today),
    tomorrow: clean(tomorrow)
  };
}

async function forecastFor(station, options) {
  const settings = options || {};
  if (!settings.apiKey) throw reasonError("NOT_CONFIGURED");
  const started = Date.now();
  let remaining = settings.timeoutMs;
  const request = function () {
    return { timeoutMs: remaining, fetcher: fetcherSlot.current() };
  };
  let payload = await fetchJson(tideUrl(station.location, settings.apiKey), request());
  if (!locationsOf(payload).length && station.fallback) {
    if (Number.isFinite(settings.timeoutMs)) {
      remaining = Math.max(1, settings.timeoutMs - (Date.now() - started));
    }
    payload = await fetchJson(tideUrl(station.fallback, settings.apiKey), request());
  }
  return summarize(payload, station);
}

module.exports = {
  forecastFor: forecastFor,
  setFetcher: fetcherSlot.set,
  resetFetcher: fetcherSlot.reset,
  taipeiDate: taipeiDate
};
