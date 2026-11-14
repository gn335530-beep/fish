/* LLM 結果路由：平台意圖交給既有規則，只有 CHAT／WEB／推薦才寫 LLM 文字。 */

import { INTENT, detectIntent, isCancelListing } from "./rules.js";
import { normalize, advance, withDraft, resetContext, requestCancel } from "./listing.js";
import { mergeDraft } from "./draft.js";
import { extractSlots } from "./slots.js";
import { beginEdit, applyEditValue } from "./editing.js";
import { needsConsent, requestConsent } from "./consent.js";
import { marketReply } from "./market.js";
import { shoppingReply } from "./shopping.js";
import { handleText } from "./service.js";

const PLATFORM_INTENTS = ["SELL", "BUY", "MARKET", "CANCEL", "EDIT"];
const RULE_PLATFORM = [INTENT.SELL, INTENT.BUY, INTENT.MARKET, INTENT.CANCEL];
const LLM_TEXT_INTENTS = ["CHAT", "WEB"];
const FALLBACK = /你是想賣魚，還是想找魚/;
const RESET_TEXT = "好，已經重來。想賣魚或找魚都可以直接說。";

function numericInSource(value, source) {
  const text = String(source || "").replace(/,/g, "");
  const number = String(value);
  if (text.indexOf(number) === -1) return false;
  const pattern = new RegExp("(^|[^\\d.])" + number.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^\\d.]|$)");
  return pattern.test(text);
}

function sanitizeSlots(llm, source) {
  const raw = llm && llm.slots && typeof llm.slots === "object" ? llm.slots : {};
  const out = {};
  if (typeof raw.fish_species === "string" && raw.fish_species.trim()) {
    out.fish_species = raw.fish_species.trim().slice(0, 30);
  }
  if (Number.isInteger(raw.species_code) && raw.species_code > 0) out.species_code = raw.species_code;
  if (Number.isInteger(raw.quantity) && raw.quantity > 0 && numericInSource(raw.quantity, source)) {
    out.quantity = raw.quantity;
  }
  if (typeof raw.condition === "string" && raw.condition.trim()) {
    out.condition = raw.condition.trim().slice(0, 20);
  }
  ["price", "price_per_taijin"].forEach(function (key) {
    if (Number.isFinite(raw[key]) && raw[key] > 0 && numericInSource(raw[key], source)) {
      out[key] = raw[key];
    }
  });
  if (typeof raw.region === "string" && raw.region.trim()) out.region = raw.region.trim().slice(0, 20);
  return out;
}

function mergeListingSlots(ctx, source, llm) {
  const found = sanitizeSlots(llm, source);
  if (!Object.keys(found).length) return ctx;
  const changes = {};
  if (found.fish_species && found.fish_species !== (ctx.draft && ctx.draft.fish_species)) {
    changes.market_quoted = false;
  }
  return withDraft(ctx, mergeDraft(ctx.draft, found), changes);
}

function slotHints(llm, source) {
  const slots = sanitizeSlots(llm, source);
  return {
    fish_species: slots.fish_species,
    species_code: slots.species_code,
    region: slots.region
  };
}

function applyLlmEdit(ctx, llm) {
  const raw = llm && llm.slots && typeof llm.slots === "object" ? llm.slots : {};
  if (!raw.edit_field || raw.edit_value === undefined || raw.edit_value === null) return null;
  const started = beginEdit(ctx, raw.edit_field);
  if (!started) return null;
  return applyEditValue(started.context, String(raw.edit_value)) || started;
}

async function sellReply(ctx, source, user, llm) {
  if (needsConsent(user)) return requestConsent(ctx, source);
  const found = Object.assign({}, extractSlots(source, null), sanitizeSlots(llm, source));
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

async function buyOrMarketReply(ctx, source, user, intent, hints) {
  if (intent === "BUY") return shoppingReply(source, user, hints);
  const result = await marketReply(source, user, ctx, hints);
  return { context: result.context || ctx, replies: result.replies || [] };
}

async function platformReply(ctx, source, user, llm) {
  const hints = slotHints(llm, source);
  if (llm.intent === "SELL") return sellReply(ctx, source, user, llm);
  if (llm.intent === "BUY" || llm.intent === "MARKET") {
    return buyOrMarketReply(ctx, source, user, llm.intent, hints);
  }
  if (llm.intent === "CANCEL") return resetReply(ctx);
  if (llm.intent === "EDIT") {
    const edited = applyLlmEdit(ctx, llm);
    if (edited) return edited;
    if (!ctx.draft) {
      return { context: ctx, replies: [{ text: "目前沒有可修改的草稿。" }] };
    }
  }
  return handleText(ctx, source, user);
}

/* 回傳 { source:"rules", result } 或 { source:"llm", llm }；flow 依 source 決定寫入什麼。 */
export async function handleMessage(context, text, user, llm) {
  const ctx = normalize(context);
  const source = String(text || "").trim();
  const ruleIntent = detectIntent(source);
  const llmIntent = llm && llm.handled ? llm.intent : null;

  if (ctx.mode === "listing" && ctx.draft) {
    if (llmIntent === "CANCEL" && !ctx.editing && !ctx.choosing_edit && !isCancelListing(source)) {
      return { source: "rules", result: requestCancel(ctx) };
    }
    if (llmIntent === "EDIT") {
      const edited = applyLlmEdit(ctx, llm);
      if (edited) return { source: "rules", result: edited };
    }
    const merged = mergeListingSlots(ctx, source, llm);
    return { source: "rules", result: await handleText(merged, source, user) };
  }

  if (RULE_PLATFORM.indexOf(ruleIntent) !== -1) {
    if (ruleIntent === INTENT.SELL) {
      return { source: "rules", result: await sellReply(ctx, source, user, llm) };
    }
    const hints = slotHints(llm, source);
    if (ruleIntent === INTENT.BUY || ruleIntent === INTENT.MARKET) {
      return { source: "rules", result: await buyOrMarketReply(ctx, source, user, ruleIntent, hints) };
    }
    return { source: "rules", result: await handleText(ctx, source, user) };
  }

  if (PLATFORM_INTENTS.indexOf(llmIntent) !== -1) {
    return { source: "rules", result: await platformReply(ctx, source, user, llm) };
  }

  if (llm && llm.handled && LLM_TEXT_INTENTS.indexOf(llmIntent) !== -1 && llm.reply_text) {
    return { source: "llm", llm: llm };
  }

  const result = await handleText(ctx, source, user);
  const fallback = (result.replies || []).length === 1 && FALLBACK.test(result.replies[0].text || "");
  if (llm && llm.handled && llmIntent === "UNKNOWN" && llm.reply_text && fallback) {
    return { source: "llm", llm: llm };
  }
  return { source: "rules", result: result };
}
