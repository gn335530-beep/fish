/* 中央氣象署 O-A0001-001 自動氣象站：依縣市在本地過濾並選站。 */

const { fetchJson, reasonError } = require("./fetch-json");
const { numberOrNull, directionText, msToKmh, beaufort } = require("./wind");
const { normalizeArea } = require("../regions");
const places = require("./places");

const API_URL = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0001-001";

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

function observationUrl(apiKey) {
  const params = new URLSearchParams({
    Authorization: apiKey,
    format: "JSON"
  });
  return API_URL + "?" + params.toString();
}

function stationsOf(payload) {
  const stations = payload && payload.records &&
    (payload.records.Station || payload.records.station);
  return Array.isArray(stations) ? stations : [];
}

/* CWA 以 -99 表示缺值；溫度、風速、陣風與高度都沿用這個規則。 */
function validNumber(value) {
  if (value === "") return null;
  const number = numberOrNull(value);
  return number === -99 ? null : number;
}

function coordinateOf(info) {
  const rows = info && Array.isArray(info.Coordinates) ? info.Coordinates : [];
  const wgs = rows.find(function (row) {
    return row.CoordinateName === "WGS84";
  }) || rows[0];
  if (!wgs) return null;
  const lat = validNumber(wgs.StationLatitude);
  const lon = validNumber(wgs.StationLongitude);
  return lat === null || lon === null ? null : { lat: lat, lon: lon };
}

function stationRow(row) {
  const info = row.GeoInfo || {};
  const weather = row.WeatherElement || {};
  const gust = weather.GustInfo || {};
  const windSpeed = msToKmh(validNumber(weather.WindSpeed));
  const gustSpeed = msToKmh(validNumber(gust.PeakGustSpeed));
  const weatherText = weather.Weather ? String(weather.Weather) : "";
  return {
    station_name: String(row.StationName || ""),
    station_id: String(row.StationId || ""),
    county: normalizeArea(info.CountyName),
    observed_at: String((row.ObsTime || {}).DateTime || ""),
    temperature_c: validNumber(weather.AirTemperature),
    weather_text: weatherText === "-99" ? "" : weatherText,
    wind_speed_kmh: windSpeed,
    wind_scale: beaufort(windSpeed),
    wind_direction_text: directionText(validNumber(weather.WindDirection)),
    wind_gust_kmh: gustSpeed,
    wind_gust_scale: beaufort(gustSpeed),
    altitude: validNumber(info.StationAltitude),
    coords: coordinateOf(info)
  };
}

function distanceKm(a, b) {
  if (!a || !b) return Infinity;
  const radians = Math.PI / 180;
  const lat1 = a.lat * radians;
  const lat2 = b.lat * radians;
  const dLat = (b.lat - a.lat) * radians;
  const dLon = (b.lon - a.lon) * radians;
  const h = Math.pow(Math.sin(dLat / 2), 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(dLon / 2), 2);
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/* 同縣市、有有效溫度、靠近縣市代表點且優先低海拔（100 公尺視為 1 公里）。 */
function stationScore(row, center) {
  const altitude = row.altitude === null ? 0 : row.altitude;
  return distanceKm(center, row.coords) + altitude / 100;
}

function pickStation(rows, city) {
  const wanted = normalizeArea(city);
  const center = places.cityCoords(city);
  const candidates = rows.filter(function (row) {
    return row.county === wanted && row.temperature_c !== null && row.coords;
  });
  if (!candidates.length) throw reasonError("NO_STATION");
  candidates.sort(function (a, b) {
    const diff = stationScore(a, center) - stationScore(b, center);
    if (diff !== 0) return diff;
    return a.station_id.localeCompare(b.station_id);
  });
  return candidates[0];
}

function publicRow(station) {
  return {
    station_name: station.station_name,
    station_id: station.station_id,
    observed_at: station.observed_at,
    temperature_c: station.temperature_c,
    weather_text: station.weather_text,
    wind_speed_kmh: station.wind_speed_kmh,
    wind_scale: station.wind_scale,
    wind_direction_text: station.wind_direction_text,
    wind_gust_kmh: station.wind_gust_kmh,
    wind_gust_scale: station.wind_gust_scale
  };
}

async function observationFor(city, options) {
  const settings = options || {};
  if (!settings.apiKey) throw reasonError("NOT_CONFIGURED");
  const payload = await fetchJson(observationUrl(settings.apiKey), {
    timeoutMs: settings.timeoutMs,
    fetcher: fetchImpl()
  });
  const rows = stationsOf(payload).map(stationRow);
  if (!rows.length) throw reasonError("NO_DATA");
  return publicRow(pickStation(rows, city));
}

module.exports = {
  observationFor: observationFor,
  setFetcher: setFetcher,
  resetFetcher: resetFetcher
};
