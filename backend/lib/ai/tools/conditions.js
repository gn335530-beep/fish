/* get_local_conditions：天氣或海況一次取得；回傳結構化資料，缺資料時說明原因。 */

const { normalizeRegion } = require("../../regions");
const openMeteo = require("../../conditions/open-meteo");
const places = require("../../conditions/places");

function reasonOf(error) {
  if (error && error.reason) return error.reason;
  if (error && error.name === "AbortError") return "UPSTREAM_TIMEOUT";
  return "UPSTREAM_UNAVAILABLE";
}

function modeOf(args, ctx) {
  const value = String(args.mode || (ctx.local && ctx.local.mode) || "weather").trim();
  return value === "sea" ? "sea" : "weather";
}

function cityOf(args, ctx) {
  return normalizeRegion(args.city) ||
    (ctx.local && ctx.local.city) ||
    normalizeRegion(ctx.user && ctx.user.city) ||
    "";
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
  const results = await Promise.allSettled([
    openMeteo.marineAt(coords, ctx.timeoutMs),
    openMeteo.weatherAt(coords, ctx.timeoutMs)
  ]);
  const marine = results[0].status === "fulfilled" ? results[0].value : null;
  const weather = results[1].status === "fulfilled" ? results[1].value : null;
  const out = {
    found: true,
    mode: "sea",
    city: city || null,
    sea_area: seaArea,
    timezone: "Asia/Taipei",
    marine: marine,
    weather: weather,
    errors: {
      marine: marine ? null : reasonOf(results[0].reason),
      weather: weather ? null : reasonOf(results[1].reason)
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
