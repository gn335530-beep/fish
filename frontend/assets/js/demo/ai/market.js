/* 行情問答：名稱先查官方代碼字典，再用代碼查價格；多候選時回問。 */

import { getMarketQuote, getMarketQuoteByCode } from "../../api/market.js";
import { findRegion, normalizeCityName } from "../../shared/regions.js";
import { ensureCatalog, findSpeciesMention } from "./species-catalog.js";
import { buildMarketQuoteCard } from "./market-quote-card.js";
import { INTENT, detectIntent } from "./rules.js";

/* 先把縣市從句子拿掉，避免把「澎湖縣」當魚名。 */
function withoutRegion(text) {
  const region = findRegion(text);
  let rest = text;
  if (region) {
    rest = rest.replace(region, " ");
    const short = region.replace(/[市縣]$/, "");
    if (short) rest = rest.replace(short, " ");
  }
  return rest;
}

function replyWith(ctx, replies) {
  return { context: Object.assign({}, ctx, { market_pending: null }), replies: replies };
}

function candidateReply(ctx, name, candidates, requestedRegion) {
  const labels = candidates.map(function (row) {
    return row.official_name;
  }).join("、");
  return {
    context: Object.assign({}, ctx, {
      market_pending: {
        query: name,
        candidates: candidates,
        region: requestedRegion || null
      }
    }),
    replies: [{ text: "搜尋到多種" + name + "，請問是哪一種" + name + "？請選擇：" + labels }]
  };
}

async function quoteFor(name, byCode, ctx, requestedRegion) {
  let data;
  try {
    data = byCode
      ? await getMarketQuoteByCode(name, requestedRegion || null, 30)
      : await getMarketQuote(name, requestedRegion || null, 30);
  } catch (error) {
    const body = error && error.data ? error.data : {};
    if (body.code === "AMBIGUOUS_SPECIES") {
      return candidateReply(ctx, name, body.candidates || [], requestedRegion);
    }
    if (body.code === "SPECIES_NOT_FOUND") {
      return replyWith(ctx, [{ text: "查無此魚種代碼：「" + name + "」。" }]);
    }
    if (body.code === "CATALOG_UNAVAILABLE") {
      return replyWith(ctx, [{ text: "目前無法取得官方魚種代碼，請稍後再試。" }]);
    }
    return replyWith(ctx, [{ text: "暫無行情" }]);
  }
  if (!data || !data.found) return replyWith(ctx, [{ text: "暫無行情" }]);
  return replyWith(ctx, [{
    card: buildMarketQuoteCard(data, { speciesName: data.official_name })
  }]);
}

function namesOf(row) {
  return [row.official_name].concat(row.aliases || []);
}

/* 先比完整名稱；只有一個候選被句子包含時才選，避免把「龍膽石斑」誤配到「石斑」。 */
function matchCandidate(text, candidates) {
  const source = String(text || "").trim();
  const exact = candidates.filter(function (row) {
    return namesOf(row).some(function (name) { return name === source; });
  });
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;

  const contained = candidates.filter(function (row) {
    return namesOf(row).some(function (name) { return source.indexOf(name) !== -1; });
  });
  return contained.length === 1 ? contained[0] : null;
}

export async function marketReply(text, user, context) {
  let ctx = context || {};
  const source = String(text || "").trim();

  if (ctx.market_pending) {
    const pending = ctx.market_pending;
    const picked = matchCandidate(source, pending.candidates || []);
    if (picked) {
      return quoteFor(String(picked.species_code), true, ctx, pending.region);
    }
    ctx = Object.assign({}, ctx, { market_pending: null });
    if (detectIntent(source) !== INTENT.MARKET) return { handled: false, context: ctx };
  }

  const rest = withoutRegion(source);
  let name = findSpeciesMention(rest);
  let catalogOk = true;
  if (!name) {
    catalogOk = await ensureCatalog();
    name = findSpeciesMention(rest);
  }

  const codeMatch = source.match(/(?:^|[^\d])(\d{2,6})(?:[^\d]|$)/);
  if (!name && codeMatch) name = codeMatch[1];
  if (!name) {
    if (!catalogOk) {
      return replyWith(ctx, [{ text: "目前無法取得官方魚種代碼，請稍後再試。" }]);
    }
    return { context: ctx, replies: [{ text: "請問想查哪一種魚的行情？" }] };
  }

  const requestedRegion = findRegion(source) || normalizeCityName((user && user.city) || "").trim();
  return quoteFor(name, false, ctx, requestedRegion);
}
