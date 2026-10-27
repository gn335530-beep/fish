/* 上架對話：收集非價格欄位、行情卡、售價引導與草稿卡。 */

import { extractSlots } from "./slots.js";
import { mergeDraft, nextMissingSlot, missingNonPriceSlots } from "./draft.js";
import { QUESTIONS, ASK_AGAIN, batchFollowupPrompt } from "./prompts.js";
import { INTENT, detectIntent } from "./rules.js";
import { quoteForDraft, hasPrice } from "./listing-market.js";

function makeContext(mode, draft, lastCards) {
  return {
    mode: mode,
    draft: draft,
    last_cards: lastCards,
    selected_product_id: null,
    editing: null,
    choosing_edit: null,
    market_quoted: false,
    pending_sale_text: null,
    awaiting_consent: false,
    detail_asked: false,
    pending_number: null
  };
}

export function resetContext() {
  return makeContext("idle", null, []);
}

/* 保留未知的 context 欄位（例如法規確認狀態），不要用固定欄位覆寫整個物件。 */
export function normalize(context) {
  const source = context || {};
  return Object.assign({}, source, {
    mode: source.mode || "idle",
    draft: source.draft || null,
    last_cards: source.last_cards || [],
    selected_product_id: source.selected_product_id || null,
    editing: source.editing || null,
    market_quoted: source.market_quoted === true,
    detail_asked: source.detail_asked === true,
    pending_number: source.pending_number == null ? null : Number(source.pending_number)
  });
}

export function withDraft(context, draft, changes) {
  return Object.assign({}, normalize(context), { mode: "listing", draft: draft }, changes || {});
}

function invalidateQuote(found) {
  if (!found) return false;
  return Object.prototype.hasOwnProperty.call(found, "fish_species") ||
    Object.prototype.hasOwnProperty.call(found, "weight_kg");
}

function askPendingNumber(ctx, value) {
  return {
    context: Object.assign({}, ctx, { pending_number: Number(value) }),
    replies: [{ text: value + " 是指重量（公斤），還是數量（尾）？" }]
  };
}

function pendingSlotOf(text) {
  const source = String(text || "");
  if (/尾|數量|條|隻|份/.test(source)) return "quantity";
  if (/重量|公斤|kg|KG|Kg|斤/.test(source)) return "weight_kg";
  return null;
}

function fillPendingNumber(ctx, text) {
  const slot = pendingSlotOf(text);
  if (!slot) return null;
  const found = {};
  found[slot] = ctx.pending_number;
  const draft = mergeDraft(ctx.draft, found);
  const changes = invalidateQuote(found) ? { market_quoted: false } : {};
  return withDraft(Object.assign({}, ctx, { pending_number: null }), draft, changes);
}

export async function advance(ctx, user) {
  const missing = missingNonPriceSlots(ctx.draft);
  if (missing.length) {
    /* 魚種還沒確定時只問魚種，等到確定後才一次列出其餘四項。 */
    if (missing.indexOf("fish_species") !== -1) {
      return { context: ctx, replies: [{ text: QUESTIONS.fish_species }] };
    }
    if (!ctx.detail_asked) {
      return {
        context: Object.assign({}, ctx, { detail_asked: true }),
        replies: [{ text: batchFollowupPrompt(missing) }]
      };
    }
    const slot = missing[0];
    return { context: ctx, replies: [{ text: QUESTIONS[slot] || ASK_AGAIN[slot] }] };
  }

  const replies = [];
  let next = ctx;
  if (!ctx.market_quoted) {
    const quote = await quoteForDraft(ctx.draft, user);
    if (quote.card) replies.push({ card: quote.card });
    else if (quote.text) replies.push({ text: quote.text });
    next = Object.assign({}, ctx, { market_quoted: true });
  }

  if (!hasPrice(next.draft)) {
    replies.push({ text: QUESTIONS.price });
    return { context: next, replies: replies };
  }

  replies.push({ text: "資料都齊了，請確認內容後按發布。" });
  replies.push({ card: { type: "draft", draft: next.draft } });
  return { context: next, replies: replies };
}

export async function startListing(text, user, base) {
  const details = {};
  const draft = mergeDraft(null, extractSlots(text, null, details));
  const ctx = withDraft(base, draft, {
    last_cards: [],
    selected_product_id: null,
    editing: null,
    market_quoted: false,
    detail_asked: false
  });
  if (details.ambiguous && details.ambiguous.length) {
    return askPendingNumber(ctx, details.ambiguous[0]);
  }
  return advance(ctx, user);
}

export function dismissCancel(context) {
  return {
    context: context,
    replies: [{ text: "好，繼續上架。" }, { card: { type: "draft", draft: context.draft } }]
  };
}

export function requestCancel(context) {
  return {
    context: Object.assign({}, context, { editing: null, choosing_edit: null }),
    replies: [
      { text: "確定取消上架？此對話會一併刪除。" },
      { card: { type: "draft_cancel" } }
    ]
  };
}

export async function continueListing(ctx, text, user) {
  if (ctx.pending_number != null) {
    const filled = fillPendingNumber(ctx, text);
    if (filled) return advance(filled, user);
    ctx = Object.assign({}, ctx, { pending_number: null });
  }

  if (detectIntent(text) === INTENT.CANCEL) {
    return requestCancel(ctx);
  }

  const missing = nextMissingSlot(ctx.draft);
  if (!missing) return advance(withDraft(ctx, ctx.draft), user);
  const details = {};
  const found = extractSlots(text, missing, details);
  if (!Object.keys(found).length) {
    return { context: ctx, replies: [{ text: ASK_AGAIN[missing] }] };
  }

  const draft = mergeDraft(ctx.draft, found);
  const changes = {};
  if (invalidateQuote(found)) changes.market_quoted = false;
  const next = withDraft(ctx, draft, changes);
  if (details.ambiguous && details.ambiguous.length) {
    return askPendingNumber(next, details.ambiguous[0]);
  }
  return advance(next, user);
}
