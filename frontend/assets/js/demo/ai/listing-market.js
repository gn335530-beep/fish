/* 上架行情卡：有代碼用代碼查價，沒有代碼才用魚種名稱查整合行情。 */

import { getMarketQuote, getMarketQuoteByCode } from "../../api/market.js";
import { normalizeCityName } from "../../shared/regions.js";
import { buildMarketQuoteCard } from "./market-quote-card.js";

export function hasPrice(draft) {
  return draft.price !== null && draft.price !== undefined && draft.price !== "";
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

  return {
    card: buildMarketQuoteCard(data, {
      speciesName: draft.fish_species,
      weightKg: draft.weight_kg
    })
  };
}
