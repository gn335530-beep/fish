/* Open-Meteo 讀取：天氣與海況各自一個端點；測試以 setFetcher 注入假回應。 */

const { fetchJson, createFetcher } = require("./fetch-json");
const { weatherSummary, marineSummary } = require("./normalize");

const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
const MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";

const fetcherSlot = createFetcher();

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
  return weatherSummary(await fetchJson(weatherUrl(coords), {
    timeoutMs: timeoutMs,
    fetcher: fetcherSlot.current()
  }));
}

async function marineAt(coords, timeoutMs) {
  return marineSummary(await fetchJson(marineUrl(coords), {
    timeoutMs: timeoutMs,
    fetcher: fetcherSlot.current()
  }));
}

module.exports = {
  weatherAt: weatherAt,
  marineAt: marineAt,
  setFetcher: fetcherSlot.set,
  resetFetcher: fetcherSlot.reset
};
