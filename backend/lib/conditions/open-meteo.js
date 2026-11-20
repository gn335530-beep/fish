/* Open-Meteo 讀取：天氣與海況各自一個端點；測試以 setFetcher 注入假回應。 */

const { abortSignal } = require("../deadline");
const { weatherSummary, marineSummary } = require("./normalize");

const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
const MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";

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

function reasonError(reason) {
  const error = new Error(reason);
  error.reason = reason;
  return error;
}

async function fetchJson(url, timeoutMs) {
  const request = abortSignal(timeoutMs);
  if (request.signal === null) throw reasonError("UPSTREAM_TIMEOUT");
  try {
    const response = await fetchImpl()(url, { signal: request.signal });
    if (!response.ok) throw reasonError("UPSTREAM_UNAVAILABLE");
    try {
      return await response.json();
    } catch (error) {
      throw reasonError("NO_DATA");
    }
  } catch (error) {
    if (error && error.reason) throw error;
    if (error && error.name === "AbortError") throw reasonError("UPSTREAM_TIMEOUT");
    throw reasonError("UPSTREAM_UNAVAILABLE");
  } finally {
    request.clear();
  }
}

function weatherUrl(coords) {
  const params = new URLSearchParams({
    latitude: String(coords.lat),
    longitude: String(coords.lon),
    current: "temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max," +
      "wind_speed_10m_max,wind_direction_10m_dominant",
    timezone: "Asia/Taipei",
    forecast_days: "7"
  });
  return WEATHER_URL + "?" + params.toString();
}

function marineUrl(coords) {
  const params = new URLSearchParams({
    latitude: String(coords.lat),
    longitude: String(coords.lon),
    current: "wave_height,wave_direction,wave_period,sea_surface_temperature",
    timezone: "Asia/Taipei",
    forecast_days: "2"
  });
  return MARINE_URL + "?" + params.toString();
}

async function weatherAt(coords, timeoutMs) {
  return weatherSummary(await fetchJson(weatherUrl(coords), timeoutMs));
}

async function marineAt(coords, timeoutMs) {
  return marineSummary(await fetchJson(marineUrl(coords), timeoutMs));
}

module.exports = {
  weatherAt: weatherAt,
  marineAt: marineAt,
  setFetcher: setFetcher,
  resetFetcher: resetFetcher
};
