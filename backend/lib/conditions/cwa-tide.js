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

function locationsOf(payload) {
  const location = payload && payload.records && payload.records.location;
  if (Array.isArray(location)) return location;
  return location ? [location] : [];
}

function pickLocation(payload, station) {
  const rows = locationsOf(payload);
  if (!rows.length) return null;
  const wanted = String(station.location || "").replace(/臺/g, "台");
  return rows.find(function (row) {
    const name = String(row.locationName || "").replace(/臺/g, "台");
    return name === wanted || name.indexOf(wanted) !== -1 || wanted.indexOf(name) !== -1;
  }) || null;
}

function tideType(text) {
  if (String(text || "").indexOf("滿") !== -1) return "high";
  if (String(text || "").indexOf("乾") !== -1) return "low";
  return "";
}

function addTime(days, item) {
  const match = TIME_RE.exec(String(item && item.dataTime || ""));
  if (!match) return;
  const parameters = Array.isArray(item.parameter) ? item.parameter : [];
  const tide = parameters.find(function (row) {
    return row.parameterName === "潮汐" || String(row.parameterName || "").indexOf("潮") !== -1;
  });
  const type = tideType(tide && tide.parameterValue);
  if (!type) return;
  const date = match[1] + "-" + match[2] + "-" + match[3];
  const time = match[4] + ":" + match[5];
  const day = days[date] || { date: date, high: [], low: [] };
  day[type].push({ time: time });
  days[date] = day;
}

function summarize(payload, station) {
  const location = pickLocation(payload, station);
  if (!location) throw reasonError("NO_DATA");
  const days = {};
  (Array.isArray(location.validTime) ? location.validTime : []).forEach(function (span) {
    (Array.isArray(span.weatherElement) ? span.weatherElement : []).forEach(function (element) {
      (Array.isArray(element.time) ? element.time : []).forEach(function (item) {
        addTime(days, item);
      });
    });
  });
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
    location: location.locationName || station.location,
    station_id: location.stationId || null,
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
