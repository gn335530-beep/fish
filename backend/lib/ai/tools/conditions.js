/* get_local_conditions：天氣或海況一次取得；回傳結構化資料，缺資料時說明原因。 */

const openMeteo = require("../../conditions/open-meteo");
const cwaTide = require("../../conditions/cwa-tide");
const places = require("../../conditions/places");
const { reasonOf } = require("../../conditions/fetch-json");
const { regionValue } = require("./region");

function modeOf(args, ctx) {
  const value = String(args.mode || (ctx.local && ctx.local.mode) || "weather").trim();
  return value === "sea" ? "sea" : "weather";
}

function cityOf(args, ctx) {
  return regionValue(args.city) || (ctx.local && ctx.local.city) || "";
}

async function weatherResult(city, timeoutMs) {
  const coords = places.cityCoords(city);
  if (!coords) return { found: true, mode: "weather", city: city, weather: null, error: "NO_REGION" };
  try {
    const weather = await openMeteo.weatherAt(coords, timeoutMs);
    return { found: true, mode: "weather", city: city, timezone: "Asia/Taipei", weather: weather };
  } catch (error) {
    return { found: true, mode: "weather", city: city, weather: null, error: reasonOf(error) };
  }
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
  const marine = results[0].status === "fulfilled" ? results[0].value : null;
  const weather = results[1].status === "fulfilled" ? results[1].value : null;
  const tide = results[2].status === "fulfilled" ? results[2].value : null;
  let tideError = null;
  if (!apiKey) tideError = "NOT_CONFIGURED";
  else if (!station) tideError = "NO_STATION";
  else if (results[2].status !== "fulfilled") tideError = reasonOf(results[2].reason);
  const out = {
    found: true,
    mode: "sea",
    city: city || null,
    sea_area: seaArea,
    timezone: "Asia/Taipei",
    marine: marine,
    weather: weather,
    tide: tide,
    errors: {
      marine: marine ? null : reasonOf(results[0].reason),
      weather: weather ? null : reasonOf(results[1].reason),
      tide: tide ? null : tideError
    }
  };
  if (!marine && !weather) out.error = "UPSTREAM_UNAVAILABLE";
  return out;
}

async function run(args, ctx) {
  const input = args && typeof args === "object" && !Array.isArray(args) ? args : {};
  if (modeOf(input, ctx) === "sea") return seaResult(input, ctx);
  return weatherResult(cityOf(input, ctx), ctx.timeoutMs);
}

module.exports = { run: run };
