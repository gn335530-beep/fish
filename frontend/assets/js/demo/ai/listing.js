/* 上架對話：收集非價格欄位、行情卡、售價引導與草稿卡。 */

import { extractSlots } from "./slots.js";
import { mergeDraft, nextMissingSlot, missingNonPriceSlots } from "./draft.js";
import { QUESTIONS, ASK_AGAIN, batchFollowupPrompt } from "./prompts.js";
import { INTENT, detectIntent } from "./rules.js";
import { quoteForDraft, hasPrice } from "./listing-market.js";
import { resolveCandidates, candidateReply } from "./listing-species.js";

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
    detail_asked: false
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
    detail_asked: source.detail_asked === true
  });
}

export function withDraft(context, draft, changes) {
  return Object.assign({}, normalize(context), { mode: "listing", draft: draft }, changes || {});
}

function invalidateQuote(found) {
  return !!found && Object.prototype.hasOwnProperty.call(found, "fish_species");
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

  /* 草稿還沒有代碼時，先用名稱查官方字典；多候選先問，查無仍可繼續。 */
  if (!ctx.market_quoted && !ctx.draft.species_code && ctx.draft.fish_species) {
    const candidates = await resolveCandidates(ctx.draft.fish_species);
    if (candidates.length > 1) return candidateReply(ctx, ctx.draft.fish_species, candidates);
    if (candidates.length === 1) {
      const draft = mergeDraft(ctx.draft, { species_code: candidates[0].species_code });
      next = Object.assign({}, ctx, { draft: draft, market_quoted: false });
    }
  }

  if (!next.market_quoted) {
    const quote = await quoteForDraft(next.draft, user);
    if (quote.ambiguous) return candidateReply(next, next.draft.fish_species, quote.ambiguous);
    if (quote.card) replies.push({ card: quote.card });
    else if (quote.text) replies.push({ text: quote.text });
    next = Object.assign({}, next, { market_quoted: true });
  }

  if (!hasPrice(next.draft)) {
    replies.push({ text: QUESTIONS.price });
    return { context: next, replies: replies };
  }

  replies.push({ text: "資料都齊了，請確認內容後按「確認上架」。" });
  replies.push({ card: { type: "draft", draft: next.draft } });
  return { context: next, replies: replies };
}

export async function startListing(text, user, base) {
  const draft = mergeDraft(null, extractSlots(text, null));
  const ctx = withDraft(base, draft, {
    last_cards: [],
    selected_product_id: null,
    editing: null,
    market_quoted: false,
    detail_asked: false
  });
  return advance(ctx, user);
}

export function dismissCancel(context) {
  return {
    context: context,
    replies: [{ text: "好，繼續上架。" }]
  };
}

export function requestCancel(context) {
  return {
    context: Object.assign({}, context, { editing: null, choosing_edit: null }),
    replies: [
      { text: "確定取消上架？此對話會刪除，並開啟新的 AI 對話。" },
      { card: { type: "draft_cancel" } }
    ]
  };
}

export async function continueListing(ctx, text, user) {
  if (detectIntent(text) === INTENT.CANCEL) {
    return requestCancel(ctx);
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
  const next = withDraft(ctx, draft, changes);
  return advance(next, user);
}
