/* 行情問答：魚種與地區都從使用者句子或個人檔案來，數字只取自行情 API。 */

import { getMarketPrice } from "../../api/market.js";
import { findSpecies, findRegion, normalizeCityName } from "./species.js";
import { guessUnknownSpecies } from "./conditions.js";

function profileRegion(user) {
  return normalizeCityName((user && user.city) || "").trim();
}

/* 未知魚種只從句子留下可能的魚名；先把縣市與行情用語去掉，避免把「澎湖縣」當魚名。 */
function unknownSpeciesName(text) {
  const region = findRegion(text);
  let rest = text;
  if (region) {
    rest = rest.replace(region, " ");
    const short = region.replace(/[市縣]$/, "");
    if (short) rest = rest.replace(short, " ");
  }
  return guessUnknownSpecies(rest);
}

function noMarketReply() {
  return { replies: [{ text: "暫無行情" }] };
}

function priceText(data) {
  return Number(data.price_per_taijin).toFixed(1).replace(/\.0$/, "") + " 元／台斤";
}

function scopeText(data, requestedRegion) {
  if (data.scope === "city") return (data.region || requestedRegion || "縣市") + "平均";
  return "全國平均";
}

function prefixText(data, explicit, profile, requestedRegion) {
  if (data.scope === "national" && requestedRegion) {
    return requestedRegion + "暫無行情，改以全國平均：";
  }
  if (!explicit && profile) return "依你的地區（" + profile + "），";
  if (!explicit && !profile) return "你的個人檔案還沒填縣市，以全國平均查詢：";
  return "";
}

function foundReply(species, data, context) {
  const place = scopeText(data, context.requestedRegion);
  const quality = data.is_aquaculture ? "養殖價格，" : "";
  const detail = "（" + quality + data.trade_date + "，" + place + "，" + data.source + "）";
  const prefix = prefixText(data, context.explicit, context.profile, context.requestedRegion);
  return {
    replies: [{ text: prefix + species.name + " 的平均價是 " + priceText(data) + detail + "。" }]
  };
}

export async function marketReply(text, user) {
  const species = findSpecies(text);
  const explicit = findRegion(text);
  const profile = profileRegion(user);
  const requestedRegion = explicit || profile;

  if (!species) {
    const candidate = unknownSpeciesName(text);
    if (candidate) return noMarketReply();
    return { replies: [{ text: "請問想查哪一種魚的行情？" }] };
  }

  let data;
  try {
    data = await getMarketPrice(species.id, requestedRegion || null);
  } catch (error) {
    return noMarketReply();
  }

  if (!data || !data.found) return noMarketReply();

  return foundReply(species, data, {
    explicit: !!explicit,
    profile: profile,
    requestedRegion: requestedRegion
  });
}
