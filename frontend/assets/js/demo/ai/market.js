/* 行情問答：名稱先查官方代碼字典，再用代碼查價格；多候選時回問。 */

import { getMarketQuote, getMarketQuoteByCode } from "../../api/market.js";
import "../../shared/format.js";
import { findRegion, normalizeCityName } from "../../shared/regions.js";
import { ensureCatalog, findSpeciesMention } from "./species-catalog.js";
import { INTENT, detectIntent } from "./rules.js";

function profileRegion(user) {
  return normalizeCityName((user && user.city) || "").trim();
}

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

function marketMeta(text, user) {
  const explicit = findRegion(text);
  const profile = profileRegion(user);
  return {
    explicit: !!explicit,
    profile: profile,
    requestedRegion: explicit || profile
  };
}

function scopeText(data, requestedRegion) {
  return window.HaisenFormat.marketScopeText({
    scope: data.scope,
    region: data.region || requestedRegion,
    price_per_taijin: data.price_per_taijin
  });
}

function prefixText(data, meta) {
  if (data.scope === "national" && meta.requestedRegion) {
    return meta.requestedRegion + "暫無行情，改以全國平均：";
  }
  if (!meta.explicit && meta.profile) return "依你的地區（" + meta.profile + "），";
  if (!meta.explicit && !meta.profile) return "你的個人檔案還沒填縣市，以全國平均查詢：";
  return "";
}

function replyWith(ctx, replies) {
  return { context: Object.assign({}, ctx, { market_pending: null }), replies: replies };
}

function priceReply(data, ctx, meta) {
  const place = scopeText(data, meta.requestedRegion);
  const quality = data.is_aquaculture ? "養殖價格，" : "";
  const detail = "（代碼 " + data.species_code + "，" + quality + data.trade_date +
    "，" + place + "，" + data.source + "）";
  const prefix = prefixText(data, meta);
  return replyWith(ctx, [{ text: prefix + data.official_name + " 的平均價是 " +
    window.HaisenFormat.marketPriceText(data) + detail + "。" }]);
}

function candidateReply(ctx, name, candidates, meta) {
  const labels = candidates.map(function (row) {
    return row.official_name + "（" + row.species_code + "）";
  }).join("、");
  return {
    context: Object.assign({}, ctx, {
      market_pending: {
        query: name,
        candidates: candidates,
        region: meta.requestedRegion || null,
        explicit: meta.explicit,
        profile: meta.profile
      }
    }),
    replies: [{ text: "「" + name + "」對到多個代碼，請選擇：" + labels }]
  };
}

async function quoteFor(name, byCode, ctx, meta) {
  let data;
  try {
    data = byCode
      ? await getMarketQuoteByCode(name, meta.requestedRegion || null)
      : await getMarketQuote(name, meta.requestedRegion || null);
  } catch (error) {
    const body = error && error.data ? error.data : {};
    if (body.code === "AMBIGUOUS_SPECIES") {
      return candidateReply(ctx, name, body.candidates || [], meta);
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
  return priceReply(data, ctx, meta);
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
      const meta = {
        explicit: pending.explicit,
        profile: pending.profile,
        requestedRegion: pending.region
      };
      return quoteFor(String(picked.species_code), true, ctx, meta);
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

  return quoteFor(name, false, ctx, marketMeta(source, user));
}
