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
    market_quoted: false
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
    market_quoted: source.market_quoted === true
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

export async function advance(ctx, user) {
  const missing = missingNonPriceSlots(ctx.draft);
  if (missing.length) {
    return { context: ctx, replies: [{ text: QUESTIONS[nextMissingSlot(ctx.draft)] }] };
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
  const draft = mergeDraft(null, extractSlots(text, null));
  const ctx = withDraft(base, draft, {
    last_cards: [],
    selected_product_id: null,
    editing: null,
    market_quoted: false
  });
  const missing = missingNonPriceSlots(draft);
  if (missing.length) return { context: ctx, replies: [{ text: batchFollowupPrompt(missing) }] };
  return advance(ctx, user);
}

export async function continueListing(ctx, text, user) {
  if (detectIntent(text) === INTENT.CANCEL) {
    return { context: resetContext(), replies: [{ text: "好，已取消這次上架。" }] };
  }

  const missing = nextMissingSlot(ctx.draft);
  if (!missing) return advance(withDraft(ctx, ctx.draft), user);
  const found = extractSlots(text, missing);
  if (!Object.keys(found).length) {
    return { context: ctx, replies: [{ text: ASK_AGAIN[missing] }] };
  }

  const draft = mergeDraft(ctx.draft, found);
  const changes = {};
  if (invalidateQuote(found)) changes.market_quoted = false;
  return advance(withDraft(ctx, draft, changes), user);
}
