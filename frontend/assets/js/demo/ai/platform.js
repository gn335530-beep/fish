/* 平台意圖處理：賣魚、找魚、行情、取消與修改；路由只決定呼叫哪一個。 */

import { INTENT } from "./intents.js";
import { extractSlots } from "./slots.js";
import { mergeDraft } from "./draft.js";
import { advance, withDraft } from "./listing.js";
import { beginEdit, applyEditValue } from "./editing.js";
import { needsConsent, requestConsent } from "./consent.js";
import { marketReply } from "./market.js";
import { shoppingReply } from "./shopping.js";
import { handleText } from "./service.js";
import { llmSlots, draftSlots, slotHints } from "./llm-slots.js";
import { resetReply } from "./reset.js";

/* 後端已驗證 slots；前端只套用模型指定且可辨識的草稿欄位。 */
export function applyLlmEdit(ctx, llm) {
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

/* 回傳與規則服務相同的 { context, replies }；未知意圖交回規則引擎。 */
export async function platformReply(ctx, userText, user, intent, llm) {
  const handler = PLATFORM_REPLIES[intent];
  if (handler) return handler(ctx, userText, user, llm);
  return handleText(ctx, userText, user);
}
