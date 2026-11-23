/* get_local_conditions：天氣或海況一次取得；回傳結構化資料，缺資料時說明原因。 */

const openMeteo = require("../../conditions/open-meteo");
const cwaForecast = require("../../conditions/cwa-forecast");
const cwaObservation = require("../../conditions/cwa-observation");
const cwaTide = require("../../conditions/cwa-tide");
const places = require("../../conditions/places");
const { localSourceRows } = require("../../conditions/sources");
const { reasonOf } = require("../../conditions/fetch-json");
const { regionValue } = require("./region");

/* 後端依問題類型決定的模式優先；沒有地區模式時才採用模型參數。 */
function modeOf(args, ctx) {
  const forced = ctx.local && ctx.local.mode;
  const value = String(forced || args.mode || "weather").trim();
  return value === "sea" ? "sea" : "weather";
}

function cityOf(args, ctx) {
  return regionValue(args.city) ||
    (ctx.local && ctx.local.city) ||
    regionValue(ctx.user && ctx.user.city) || "";
}

function settled(rows, index) {
  const row = rows[index];
  return row.status === "fulfilled"
    ? { value: row.value, error: null }
    : { value: null, error: reasonOf(row.reason) };
}

/* 天氣以 CWA 預報為主；目前氣溫、現象與風只採用自動氣象站觀測。 */
function mergeObservation(weather, observation) {
  if (!observation) return weather;
  const merged = Object.assign({}, weather);
  merged.current_temperature_c = observation.temperature_c;
  if (observation.weather_text) merged.current_weather_text = observation.weather_text;
  if (observation.wind_speed_kmh !== null) {
    merged.current_wind_speed_kmh = observation.wind_speed_kmh;
    merged.current_wind_scale = observation.wind_scale;
  }
  if (observation.wind_direction_text) {
    merged.current_wind_direction_text = observation.wind_direction_text;
  }
  merged.current_wind_gust_kmh = observation.wind_gust_kmh;
  merged.current_wind_gust_scale = observation.wind_gust_scale;
  return merged;
}

/* 天氣只使用中央氣象署官方預報與觀測；查不到即時天氣，不 fallback 回 Open-Meteo。 */
async function weatherResult(city, ctx) {
  if (!places.cityCoords(city)) {
    return { found: true, mode: "weather", city: city || null, weather: null, error: "NO_REGION" };
  }
  if (!ctx.cwaApiKey) {
    return { found: true, mode: "weather", city: city, weather: null, error: "NOT_CONFIGURED" };
  }
  const results = await Promise.allSettled([
    cwaForecast.forecastFor(city, { apiKey: ctx.cwaApiKey, timeoutMs: ctx.timeoutMs }),
    cwaObservation.observationFor(city, { apiKey: ctx.cwaApiKey, timeoutMs: ctx.timeoutMs })
  ]);
  const forecast = settled(results, 0);
  if (!forecast.value) {
    return { found: true, mode: "weather", city: city, weather: null, error: forecast.error };
  }
  const observed = settled(results, 1);
  const weather = mergeObservation(forecast.value, observed.value);
  return {
    found: true,
    mode: "weather",
    city: city,
    timezone: "Asia/Taipei",
    weather: weather,
    observation: observed.value,
    observation_error: observed.value ? null : observed.error,
    sources: localSourceRows({ mode: "weather", weather: weather, observation: observed.value })
  };
}

async function seaResult(args, ctx) {
  const city = cityOf(args, ctx);
  const seaArea = places.normalizeSeaArea(args.sea_area || args.seaArea) ||
    (ctx.local && ctx.local.seaArea) ||
    places.seaAreaForCity(city);
  if (!seaArea) {
    return {
      found: true, mode: "sea", city: city || null, sea_area: null,
      marine: null, weather: null, error: "NO_SEA_AREA"
    };
  }
  const coords = places.seaCoords(seaArea);
  const station = places.tideStationForSea(seaArea);
  const apiKey = ctx.cwaApiKey || "";
  const tideTask = apiKey && station
    ? cwaTide.forecastFor(station, { apiKey: apiKey, timeoutMs: ctx.timeoutMs })
    : Promise.resolve(null);
  const results = await Promise.allSettled([
    openMeteo.marineAt(coords, ctx.timeoutMs),
    openMeteo.weatherAt(coords, ctx.timeoutMs),
    tideTask
  ]);
  const marineResult = settled(results, 0);
  const weatherResult = settled(results, 1);
  const tideResult = settled(results, 2);
  const tide = tideResult.value;
  let tideError = tideResult.error;
  if (!apiKey) tideError = "NOT_CONFIGURED";
  else if (!station) tideError = "NO_STATION";
  const out = {
    found: true,
    mode: "sea",
    city: city || null,
    sea_area: seaArea,
    timezone: "Asia/Taipei",
    marine: marineResult.value,
    weather: weatherResult.value,
    tide: tide,
    sources: localSourceRows({ mode: "sea", marine: marineResult.value, weather: weatherResult.value, tide: tide }),
    errors: {
      marine: marineResult.error,
      weather: weatherResult.error,
      tide: tide ? null : tideError
    }
  };
  if (!marineResult.value && !weatherResult.value) out.error = "UPSTREAM_UNAVAILABLE";
  return out;
}

async function run(args, ctx) {
  const input = args && typeof args === "object" && !Array.isArray(args) ? args : {};
  if (modeOf(input, ctx) === "sea") return seaResult(input, ctx);
  return weatherResult(cityOf(input, ctx), ctx);
}

module.exports = { run: run };
