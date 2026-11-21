/* 模型驅動的上架回覆：套用草稿變更、記錄修正歷史、進入基本模式。 */

import { mergeDraft } from "./draft.js";
import { withDraft } from "./listing.js";
import { handleText } from "./service.js";

export const BASIC_MODE_NOTICE = "AI 暫時無法協助，已切換基本模式；你仍可完成上架。";

/* 這些錯誤碼表示模型不可用，要切換基本模式；驗證失敗（LLM_GUARD_REJECTED）
   與旗標關閉（LLM_DISABLED）不在此列，維持規則模式。 */
const BASIC_MODE_ERRORS = [
  "LLM_TIMEOUT", "LLM_RATE_LIMITED", "LLM_NOT_CONFIGURED",
  "LLM_UPSTREAM_ERROR", "LLM_INVALID_OUTPUT"
];

export function isBasicModeError(llm) {
  return !!(llm && llm.handled !== true && BASIC_MODE_ERRORS.indexOf(llm.error_code) !== -1);
}

/* 模型失敗時：寫入 basic_mode、顯示一次提示，其餘照規則引擎。 */
export async function enterBasicMode(ctx, userText, user) {
  const result = await handleText(Object.assign({}, ctx, { basic_mode: true }), userText, user);
  return {
    context: Object.assign({}, result.context, { basic_mode: true }),
    replies: [{ text: BASIC_MODE_NOTICE }].concat(result.replies || [])
  };
}

/* 套用模型回傳的草稿變更與修正紀錄；卡片顯示時機已由後端驗證。
   show_market_card 的行情卡時機留待 ticket 07 實作。 */
export async function applyListingReply(ctx, listing) {
  const changes = listing.draft_changes || {};
  const draft = mergeDraft(ctx.draft, changes);
  const extra = {
    correction_history: listing.correction_history || [],
    protected_names: listing.protected_names || [],
    condition_proposal: listing.condition_proposal || null
  };
  /* 魚種換了先讓舊行情失效；ticket 07 會依 next_action 重查。 */
  if (Object.prototype.hasOwnProperty.call(changes, "fish_species")) extra.market_quoted = false;
  const next = withDraft(ctx, draft, extra);
  const replies = [];
  if (listing.reply_text) replies.push({ text: listing.reply_text });
  if (listing.next_action === "show_draft_card") {
    replies.push({ card: { type: "draft", draft: draft, hide_edit: true } });
  }
  return { context: next, replies: replies };
}
