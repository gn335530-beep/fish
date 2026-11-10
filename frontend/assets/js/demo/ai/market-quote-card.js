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

export function buildMarketQuoteCard(data, options) {
  const opts = options || {};
  const history = data.history || [];
  const seven = history.slice(-7);
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
