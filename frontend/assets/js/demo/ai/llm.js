/* LLM 結果路由：只決定規則／模型意圖優先序與要交付的結果。 */

import { INTENT, PLATFORM_INTENTS, REPLY_INTENTS, RULE_PRIORITY_INTENTS } from "./intents.js";
import { detectIntent, isCancelListing } from "./rules.js";
import { normalize, withDraft, requestCancel } from "./listing.js";
import { mergeDraft } from "./draft.js";
import { draftSlots } from "./llm-slots.js";
import { applyLlmEdit, platformReply } from "./platform.js";
import { handleText } from "./service.js";

const RECOMMEND_BLOCKERS = [INTENT.SELL, INTENT.MARKET, INTENT.CANCEL, INTENT.EDIT];
const FALLBACK = /你是想賣魚，還是想找魚/;

/* 規則是否只回了通用的「賣魚或找魚」引導；配額提示會取代這句話。 */
export function isFallbackReply(result) {
  const replies = (result && result.replies) || [];
  return replies.length === 1 && FALLBACK.test(replies[0].text || "");
}

function mergeListingSlots(ctx, llm) {
  const found = draftSlots(llm);
  if (!Object.keys(found).length) return ctx;
  const changes = {};
  if (found.fish_species && found.fish_species !== (ctx.draft && ctx.draft.fish_species)) {
    changes.market_quoted = false;
  }
  return withDraft(ctx, mergeDraft(ctx.draft, found), changes);
}

/* 回傳 { origin:"rules", result } 或 { origin:"llm", llm }；flow 依 origin 決定寫入什麼。 */
export async function handleMessage(context, text, user, llm) {
  const ctx = normalize(context);
  const userText = String(text || "").trim();
  const ruleIntent = detectIntent(userText);
  const llmIntent = llm && llm.handled ? llm.intent : null;

  if (ctx.mode === "listing" && ctx.draft) {
    if (llmIntent === INTENT.CANCEL && !ctx.editing && !ctx.choosing_edit &&
      !isCancelListing(userText)) {
      return { origin: "rules", result: requestCancel(ctx) };
    }
    if (llmIntent === INTENT.EDIT) {
      const edited = applyLlmEdit(ctx, llm);
      if (edited) return { origin: "rules", result: edited };
    }
    const merged = mergeListingSlots(ctx, llm);
    return { origin: "rules", result: await handleText(merged, userText, user) };
  }

  const productRecommendation = llm && llm.handled && llmIntent === INTENT.PRODUCT_RECOMMEND &&
    llm.reply_text && RECOMMEND_BLOCKERS.indexOf(ruleIntent) === -1;
  if (productRecommendation) return { origin: "llm", llm: llm };

  if (RULE_PRIORITY_INTENTS.indexOf(ruleIntent) !== -1) {
    /* CANCEL 走既有規則服務，保留修改中與確認中的特殊處理。 */
    if (ruleIntent === INTENT.CANCEL) {
      return { origin: "rules", result: await handleText(ctx, userText, user) };
    }
    return {
      origin: "rules",
      result: await platformReply(ctx, userText, user, ruleIntent, llm)
    };
  }

  if (PLATFORM_INTENTS.indexOf(llmIntent) !== -1) {
    return {
      origin: "rules",
      result: await platformReply(ctx, userText, user, llmIntent, llm)
    };
  }

  if (llm && llm.handled && REPLY_INTENTS.indexOf(llmIntent) !== -1 && llm.reply_text) {
    return { origin: "llm", llm: llm };
  }

  const result = await handleText(ctx, userText, user);
  if (llm && llm.handled && llmIntent === INTENT.UNKNOWN && llm.reply_text &&
    isFallbackReply(result)) {
    return { origin: "llm", llm: llm };
  }
  return { origin: "rules", result: result };
}
