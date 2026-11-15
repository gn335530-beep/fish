/* get_market_price：包裝既有官方行情服務，只回平均價、交易日期與官方來源。 */

const quote = require("../../market/quote-service");
const { regionOf } = require("./region");
const deadline = require("../../deadline");

const HISTORY_KEYS = ["trade_date", "price_per_kg", "price_per_taijin"];
const MODEL_KEYS = [
  "found", "species_code", "official_name", "region", "trade_date",
  "price_per_kg", "price_per_taijin", "is_aquaculture"
];

function historyOf(rows) {
  return (rows || []).map(function (row) {
    const point = {};
    HISTORY_KEYS.forEach(function (key) { point[key] = row[key]; });
    return point;
  });
}

/* 模型視圖：只留回答行情所需欄位，完整歷史與品質資料只給前端組卡。 */
function modelView(data) {
  if (!data || data.found !== true) {
    return {
      found: false,
      species_code: (data && data.species_code) || null,
      official_name: (data && data.official_name) || null
    };
  }
  const view = {};
  MODEL_KEYS.forEach(function (key) {
    if (data[key] !== undefined) view[key] = data[key];
  });
  return view;
}

function clean(data) {
  if (!data || data.found !== true) {
    return {
      found: false,
      reason: data && data.timedOut === true
        ? "UPSTREAM_TIMEOUT"
        : ((data && (data.reason || data.error)) || "NO_TRADE_DATA"),
      species_code: (data && data.species_code) || null,
      official_name: (data && data.official_name) || null
    };
  }
  return {
    found: true,
    species_code: data.species_code,
    official_name: data.official_name || null,
    is_aquaculture: data.is_aquaculture === true,
    scope: data.scope,
    region: data.region,
    trade_date: data.trade_date,
    price_per_kg: data.price_per_kg,
    price_per_taijin: data.price_per_taijin,
    source: data.source,
    source_url: data.source_url,
    fetched_at: data.fetched_at,
    quality: data.quality,
    history: historyOf(data.history)
  };
}

async function run(args, ctx) {
  const options = {
    region: regionOf(args, ctx),
    includeHistory: true,
    days: 30,
    force: true,
    timeoutMs: ctx.timeoutMs
  };
  const code = String(args.species_code || args.code || "").trim();
  const name = String(args.species_name || args.species || "").trim();
  try {
    const data = await deadline.race(function () {
      return code ? quote.quoteByCode(code, options) : quote.quoteByName(name, options);
    }, ctx.timeoutMs, { found: false, reason: "UPSTREAM_TIMEOUT" });
    return clean(data);
  } catch (error) {
    return { found: false, reason: "UPSTREAM_UNAVAILABLE" };
  }
}

module.exports = { run: run, modelView: modelView };
