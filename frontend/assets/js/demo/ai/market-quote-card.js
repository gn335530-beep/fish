/* 行情查詢結果轉成行情卡 payload；對話問答與上架流程共用。 */

import "../../shared/format.js";

const format = window.HaisenFormat;

function statsOf(history) {
  const prices = (history || []).map(function (point) {
    return Number(point.price_per_taijin);
  }).filter(function (value) { return Number.isFinite(value); });
  if (!prices.length) return { high: null, low: null };
  return { high: Math.max.apply(null, prices), low: Math.min.apply(null, prices) };
}

function daysBefore(iso, days) {
  const date = new Date(String(iso) + "T00:00:00.000Z");
  if (isNaN(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/* 近 N 個日曆天內的交易日，不是固定 N 筆（週末休市日不補）。 */
function lastDays(history, days) {
  if (!history.length) return [];
  const latest = history[history.length - 1].trade_date;
  const from = daysBefore(latest, days - 1);
  return history.filter(function (point) {
    return point.trade_date >= from;
  });
}

export function buildMarketQuoteCard(data, options) {
  const opts = options || {};
  const history = data.history || [];
  const seven = lastDays(history, 7);
  const short = statsOf(seven);
  const wide = statsOf(history);
  const weightKg = Number(opts.weightKg) || 0;
  const hasWeight = weightKg > 0;
  return {
    type: "market_quote",
    species_code: data.species_code || null,
    species_name: opts.speciesName || data.official_name || null,
    official_name: data.official_name || null,
    scope: data.scope,
    region: data.region,
    trade_date: data.trade_date,
    price_per_kg: data.price_per_kg,
    price_per_taijin: data.price_per_taijin,
    is_aquaculture: data.is_aquaculture === true,
    source: data.source,
    source_url: data.source_url,
    fetched_at: data.fetched_at,
    quality: data.quality,
    weight_kg: hasWeight ? weightKg : null,
    weight_taijin: hasWeight ? format.taijinFromKg(weightKg) : null,
    estimated_total: hasWeight ? Math.round(Number(data.price_per_taijin) * format.taijinFromKg(weightKg)) : null,
    history: seven,
    history_30: history,
    high: short.high,
    low: short.low,
    high_30: wide.high,
    low_30: wide.low
  };
}
