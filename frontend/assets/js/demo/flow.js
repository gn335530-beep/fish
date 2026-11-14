/* 對話流程：送出訊息、上傳照片、發布草稿、商品諮詢。 */

import { state, update, replaceMessages, appendMessages } from "./store.js";
import * as api from "./api.js";
import { getProduct, createProduct } from "../api/products.js";
import * as ai from "./ai/service.js";
import { requestReply, llmBatch } from "./ai/reply.js";
import { draftToProduct } from "./ai/draft.js";
import { uploadImage } from "./upload.js";
import { openRoom, ensureAssistantRoom } from "./rooms.js";

let ui = {
  render: function () {},
  scrollEnd: function () {},
  scrollToBatch: function () {},
  notify: function () {}
};

export function initFlow(options) {
  ui = Object.assign(ui, options || {});
}

export async function ensureRoom() {
  return ensureAssistantRoom();
}

function showMessages() {
  ui.render();
  ui.scrollEnd();
}

function showBatch(created) {
  ui.render();
  if (created.length) ui.scrollToBatch(created[0].seq);
  else ui.scrollEnd();
}

function isCurrentRoom(roomId) {
  return !!state.room && state.room.id === roomId;
}

export async function runReplies(result, roomId) {
  const targetId = roomId || state.room.id;
  const replies = result.replies || [];
  const created = [];

  for (let i = 0; i < replies.length; i++) {
    const reply = replies[i];
    const payload = { sender_type: "ai" };
    if (reply.text) payload.text = reply.text;
    if (reply.card) payload.card = reply.card;
    if (i === replies.length - 1 && result.context) payload.context = result.context;
    created.push(await api.sendMessage(targetId, payload));
  }

  if (result.context && isCurrentRoom(targetId)) {
    update({ room: Object.assign({}, state.room, { context: result.context }) });
  }
  /* 法規確認後只留新的提問，先前的對話紀錄一併從後端清除。 */
  if (result.clear_history && created.length) {
    let clearError = null;
    try {
      await api.clearConversation(targetId, created[0].seq);
    } catch (error) {
      clearError = error;
    }
    if (isCurrentRoom(targetId)) replaceMessages(created);
    showBatch(created);
    if (clearError) ui.notify(clearError);
    return;
  }
  if (isCurrentRoom(targetId)) appendMessages(created);
  showBatch(created);
}

/* AI 回覆失敗一律回到規則；等待指示只在此期間出現。 */
async function replyAfterMessage(room, message, value) {
  update({ aiPending: Number(state.aiPending || 0) + 1 });
  try {
    const routed = await requestReply(room, message, value, state.user);
    if (routed.source === "llm") await runReplies(llmBatch(routed.llm), room.id);
    else await runReplies(routed.result, room.id);
  } finally {
    update({ aiPending: Math.max(0, Number(state.aiPending || 0) - 1) });
  }
}

export async function submitText(text) {
  const value = String(text || "").trim();
  if (!value || !api.isLoggedIn()) return;

  try {
    if (!state.room) return;
    const room = state.room;
    const message = await api.sendMessage(room.id, { text: value });
    if (isCurrentRoom(room.id)) {
      appendMessages([message]);
      showMessages();
    }
    if (room.type === "deal") return;
    await replyAfterMessage(room, message, value);
  } catch (error) {
    ui.notify(error);
  }
}

export async function submitPhoto(file) {
  if (!api.isLoggedIn()) return;
  try {
    if (!state.room) return;
    const url = await uploadImage(file);
    const message = await api.sendMessage(state.room.id, { image_url: url });
    appendMessages([message]);
    showMessages();
    if (state.room.type === "deal") return;
    const result = await ai.handlePhoto(state.room.context, url, state.user);
    await runReplies(result);
  } catch (error) {
    ui.notify(error);
  }
}

export async function publishDraft() {
  const draft = state.room && state.room.context ? state.room.context.draft : null;
  if (!draft) {
    ui.notify(new Error("找不到草稿，請重新上架"));
    return;
  }
  if (ai.needsConsent(state.user)) {
    await runReplies(ai.requestConsent(state.room.context, state.room.context.pending_sale_text || "我要賣魚"));
    return;
  }

  try {
    const product = await createProduct(draftToProduct(draft, state.user));
    const message = await api.sendMessage(state.room.id, {
      sender_type: "ai",
      text: "已上架：" + product.title
    });

    const context = ai.resetContext();
    await api.updateContext(state.room.id, { context: context });
    await api.clearConversation(state.room.id, message.seq);

    update({ room: Object.assign({}, state.room, { context: context }) });
    replaceMessages([message]);
    showMessages();

    document.dispatchEvent(new CustomEvent("haisen:products-changed"));
    if (window.toast) window.toast("已上架：" + product.title);
  } catch (error) {
    ui.notify(error);
  }
}

export async function explainProduct(productId) {
  try {
    const product = await getProduct(productId);
    await runReplies(await ai.explainProduct(product, state.room.context));
  } catch (error) {
    ui.notify(error);
  }
}

/* 「洽談購買」：後端找或建立房間與草稿，前端切到交易房視圖。 */
export async function beginDeal(productId, quantity) {
  try {
    const result = await api.initiateChannel(productId, quantity);
    const room = await openRoom(result.conversation);
    ui.render();
    ui.scrollEnd(true);
    return room;
  } catch (error) {
    ui.notify(error);
    return null;
  }
}
