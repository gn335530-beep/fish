/* AI 回覆流程：配額錯誤先跑規則；規則也無法處理時留下提示與重試。 */

import { state, update } from "../store.js";
import { requestReply, llmBatch } from "./reply.js";
import { isFallbackReply } from "./llm.js";
import { retryNotice } from "./retry.js";

/* aiPending 是「等待中的 AI 回覆數」，不是使用者訊息數。 */
function adjustAiPendingReplies(delta) {
  update({ aiPending: Math.max(0, Number(state.aiPending || 0) + delta) });
}

async function deliver(routed, room, runReplies) {
  if (routed.origin === "llm") await runReplies(llmBatch(routed.llmResult), room.id);
  else await runReplies(routed.result, room.id);
}

/* 回傳提示文字；不是可重試的 fallback 就回 null。 */
function retryableNotice(routed) {
  const notice = retryNotice(routed.llmResult);
  return notice && isFallbackReply(routed.result) ? notice : null;
}

function offerRetry(room, exchange, notice) {
  update({
    aiRetry: {
      roomId: room.id,
      messageId: exchange.messageId,
      userText: exchange.userText,
      notice: notice
    }
  });
}

/* 使用者送出訊息後呼叫；可重試錯誤由這裡決定是否顯示提示。 */
export async function sendAiReply(room, message, userText, user, runReplies) {
  const exchange = { messageId: message.id, userText: userText };
  update({ aiRetry: null });
  adjustAiPendingReplies(1);
  try {
    const routed = await requestReply(room, { id: exchange.messageId }, exchange.userText, user);
    const notice = retryableNotice(routed);
    if (notice) {
      offerRetry(room, exchange, notice);
      return;
    }
    await deliver(routed, room, runReplies);
  } finally {
    adjustAiPendingReplies(-1);
  }
}

/* 重試沿用原本的 message_id，不重寫使用者訊息。 */
export async function retryAiReply(runReplies) {
  const retry = state.aiRetry;
  const room = state.room;
  if (!retry || !room || retry.roomId !== room.id || state.aiPending > 0) return;
  adjustAiPendingReplies(1);
  try {
    const routed = await requestReply(room, { id: retry.messageId }, retry.userText, state.user);
    const notice = retryableNotice(routed);
    if (notice) {
      offerRetry(room, retry, notice);
      return;
    }
    update({ aiRetry: null });
    await deliver(routed, room, runReplies);
  } finally {
    adjustAiPendingReplies(-1);
  }
}
