/* 上架行情卡：只在使用者自己的縣市查行情，查無或上游失敗都不阻擋定價。 */

import { getMarketPrice } from "../../api/market.js";
import { normalizeCityName } from "./species.js";

const KG_PER_TAIJIN = 0.6;

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}

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
    species_id: data.species_id,
    species_name: draft.fish_species,
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
    weight_taijin: round1(weight / KG_PER_TAIJIN),
    estimated_total: Math.round(Number(data.price_per_taijin) * weight / KG_PER_TAIJIN),
    history: seven,
    history_30: history,
    high: short.high,
    low: short.low,
    high_30: wide.high,
    low_30: wide.low
  };
}

export async function quoteForDraft(draft, user) {
  if (!draft || !draft.species_id) return { text: "暫無行情" };
  const region = normalizeCityName((user && user.city) || "").trim();

  let data;
  try {
    /* 先取 30 個交易日，再取 7 個（後端會命中同一段快取）；卡片預設顯示 7 日。 */
    data = await getMarketPrice(draft.species_id, region || null, 30);
    if (!data || !data.found) return { text: "暫無行情" };
  } catch (error) {
    return { text: "暫無行情" };
  }

  let seven = null;
  try {
    seven = await getMarketPrice(draft.species_id, region || null, 7);
  } catch (error) {
    seven = null;
  }
  const short = seven && seven.found && seven.history ? seven.history : (data.history || []).slice(-7);
  return { card: buildCard(draft, data, short) };
}
