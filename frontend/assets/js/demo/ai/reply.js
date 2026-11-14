/* AI 回覆請求與批次轉換：端點失敗時回 rules fallback，不把技術錯誤帶到 UI。 */

import * as api from "../api.js";
import { handleMessage } from "./llm.js";

export async function requestReply(room, message, text, user) {
  let llm;
  try {
    llm = await api.aiReply(room.id, message.id, room.context || {});
  } catch (error) {
    llm = { handled: false, error_code: "LLM_UPSTREAM_ERROR", retryable: false };
  }
  return handleMessage(room.context, text, user, llm);
}

/* LLM 文字批次：目前只寫入 reply_text；資料來源卡屬後續 ticket 06。 */
export function llmBatch(llm) {
  return { replies: llm.reply_text ? [{ text: llm.reply_text }] : [] };
}
