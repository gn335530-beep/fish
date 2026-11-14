/* LLM 結果路由：平台意圖交給既有規則，只有 CHAT／WEB／推薦才寫 LLM 文字。 */

import { INTENT, PLATFORM_INTENTS, REPLY_INTENTS, RULE_INTENTS } from "./intents.js";
import { detectIntent, isCancelListing } from "./rules.js";
import { normalize, advance, withDraft, resetContext, requestCancel } from "./listing.js";
import { mergeDraft } from "./draft.js";
import { extractSlots } from "./slots.js";
import { beginEdit, applyEditValue } from "./editing.js";
import { needsConsent, requestConsent } from "./consent.js";
import { marketReply } from "./market.js";
import { shoppingReply } from "./shopping.js";
import { handleText } from "./service.js";

const DRAFT_SLOTS = [
  "fish_species", "species_code", "quantity", "condition", "price", "price_per_taijin", "region"
];
const PRODUCT_HINT = /(適合|推薦|以內|預算|乾煎|清蒸|煮湯|刺少|白肉|口感|料理|想找|想要)/;
const RECOMMEND_BLOCKERS = [INTENT.SELL, INTENT.MARKET, INTENT.CANCEL];
const FALLBACK = /你是想賣魚，還是想找魚/;
const RESET_TEXT = "好，已經重來。想賣魚或找魚都可以直接說。";

/* 規則是否只回了通用的「賣魚或找魚」引導；配額提示會取代這句話。 */
export function isFallbackReply(result) {
  const replies = (result && result.replies) || [];
  return replies.length === 1 && FALLBACK.test(replies[0].text || "");
}

/* 後端已驗證 slots；前端只挑草稿欄位使用，不再檢查型別或數字來源。 */
function llmSlots(llm) {
  return (llm && llm.slots && typeof llm.slots === "object") ? llm.slots : {};
}

function draftSlots(llm) {
  const raw = llmSlots(llm);
  const found = {};
  DRAFT_SLOTS.forEach(function (key) {
    if (raw[key] !== undefined) found[key] = raw[key];
  });
  return found;
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

function slotHints(llm) {
  const slots = llmSlots(llm);
  return {
    fish_species: slots.fish_species,
    species_code: slots.species_code,
    region: slots.region
  };
}

function applyLlmEdit(ctx, llm) {
  const raw = llmSlots(llm);
  if (!raw.edit_field || raw.edit_value === undefined || raw.edit_value === null) return null;
  const started = beginEdit(ctx, raw.edit_field);
  if (!started) return null;
  return applyEditValue(started.context, String(raw.edit_value)) || started;
}

async function sellReply(ctx, userText, user, llm) {
  if (needsConsent(user)) return requestConsent(ctx, userText);
  const found = Object.assign({}, extractSlots(userText, null), draftSlots(llm));
  const draft = mergeDraft(null, found);
  const next = withDraft(ctx, draft, {
    last_cards: [],
    selected_product_id: null,
    editing: null,
    choosing_edit: null,
    market_quoted: false,
    detail_asked: false
  });
  return advance(next, user);
}

function resetReply(ctx) {
  return { context: resetContext(), replies: [{ text: RESET_TEXT }] };
}

async function buyOrMarketReply(ctx, userText, user, intent, hints) {
  if (intent === INTENT.BUY) return shoppingReply(userText, user, hints);
  const result = await marketReply(userText, user, ctx, hints);
  return { context: result.context || ctx, replies: result.replies || [] };
}

async function buyReply(ctx, userText, user, llm) {
  return buyOrMarketReply(ctx, userText, user, INTENT.BUY, slotHints(llm));
}

async function marketOnlyReply(ctx, userText, user, llm) {
  return buyOrMarketReply(ctx, userText, user, INTENT.MARKET, slotHints(llm));
}

async function editReply(ctx, userText, user, llm) {
  const edited = applyLlmEdit(ctx, llm);
  if (edited) return edited;
  if (!ctx.draft) return { context: ctx, replies: [{ text: "目前沒有可修改的草稿。" }] };
  return handleText(ctx, userText, user);
}

const PLATFORM_REPLIES = {
  [INTENT.SELL]: sellReply,
  [INTENT.BUY]: buyReply,
  [INTENT.MARKET]: marketOnlyReply,
  [INTENT.CANCEL]: resetReply,
  [INTENT.EDIT]: editReply
};

async function platformReply(ctx, userText, user, llm) {
  const handler = PLATFORM_REPLIES[llm.intent];
  if (handler) return handler(ctx, userText, user, llm);
  return handleText(ctx, userText, user);
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
    llm.reply_text &&
    RECOMMEND_BLOCKERS.indexOf(ruleIntent) === -1 &&
    (ruleIntent !== INTENT.BUY || PRODUCT_HINT.test(userText));
  if (productRecommendation) return { origin: "llm", llm: llm };

  if (RULE_INTENTS.indexOf(ruleIntent) !== -1) {
    if (ruleIntent === INTENT.SELL) {
      return { origin: "rules", result: await sellReply(ctx, userText, user, llm) };
    }
    if (ruleIntent === INTENT.BUY || ruleIntent === INTENT.MARKET) {
      return {
        origin: "rules",
        result: await buyOrMarketReply(ctx, userText, user, ruleIntent, slotHints(llm))
      };
    }
    return { origin: "rules", result: await handleText(ctx, userText, user) };
  }

  if (PLATFORM_INTENTS.indexOf(llmIntent) !== -1) {
    return { origin: "rules", result: await platformReply(ctx, userText, user, llm) };
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
