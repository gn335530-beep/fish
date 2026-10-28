/* 上架行情卡：有代碼用代碼查價，沒有代碼才用魚種名稱查整合行情。 */

import { getMarketQuote, getMarketQuoteByCode } from "../../api/market.js";
import { normalizeCityName } from "../../shared/regions.js";
import "../../shared/format.js";

const format = window.HaisenFormat;

export function hasPrice(draft) {
  return (draft.price !== null && draft.price !== undefined && draft.price !== "") ||
    (draft.price_per_taijin !== null && draft.price_per_taijin !== undefined && draft.price_per_taijin !== "");
}

function statsOf(history) {
  const prices = (history || []).map(function (point) {
    return Number(point.price_per_taijin);
  }).filter(function (value) { return Number.isFinite(value); });
  if (!prices.length) return { high: null, low: null };
  return { high: Math.max.apply(null, prices), low: Math.min.apply(null, prices) };
}

function buildCard(draft, data, seven) {
  const weight = Number(draft.weight_kg) || 0;
  const history = data.history || [];
  const short = statsOf(seven);
  const wide = statsOf(history);
  return {
    type: "market_quote",
    species_code: data.species_code || null,
    species_name: draft.fish_species,
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
    weight_kg: weight,
    weight_taijin: format.taijinFromKg(weight),
    estimated_total: Math.round(Number(data.price_per_taijin) * format.taijinFromKg(weight)),
    history: seven,
    history_30: history,
    high: short.high,
    low: short.low,
    high_30: wide.high,
    low_30: wide.low
  };
}

export async function quoteForDraft(draft, user) {
  if (!draft || (!draft.species_code && !draft.fish_species)) return { text: "暫無行情" };
  const region = normalizeCityName((user && user.city) || "").trim();

  let data;
  try {
    /* 一次取 30 個交易日；7 日卡直接從同一份歷史取最後 7 筆。 */
    data = draft.species_code
      ? await getMarketQuoteByCode(draft.species_code, region || null, 30)
      : await getMarketQuote(draft.fish_species, region || null, 30);
    if (!data || !data.found) return { text: "暫無行情" };
  } catch (error) {
    const body = error && error.data ? error.data : {};
    if (body.code === "AMBIGUOUS_SPECIES") return { ambiguous: body.candidates || [] };
    return { text: "暫無行情" };
  }

  const history = data.history || [];
  return { card: buildCard(draft, data, history.slice(-7)) };
}
