/* 對話流程：送出訊息、上傳照片、發布草稿、商品諮詢。 */

import { state, update, replaceMessages, appendMessages } from "./store.js";
import * as api from "./api.js";
import { getProduct, createProduct } from "../api/products.js";
import * as ai from "./ai/service.js";
import { resetContext } from "./ai/listing.js";
import { sendAiReply, retryAiReply } from "./ai/reply-flow.js";
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
export async function retryReply() {
  return retryAiReply(runReplies);
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
    await sendAiReply(room, message, value, state.user, runReplies);
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
  const room = state.room;
  const context = room && room.context;
  const draft = context ? context.draft : null;
  if (!draft) {
    ui.notify(new Error("找不到草稿，請重新上架"));
    return;
  }
  if (state.publishing) return;

  const roomId = room.id;
  update({ publishing: true });
  try {
    if (ai.needsConsent(state.user)) {
      await runReplies(ai.requestConsent(context, context.pending_sale_text || "我要賣魚"), roomId);
      return;
    }

    const product = await createProduct(draftToProduct(draft, state.user));
    const notice = "已上架：" + product.title;
    const message = await api.sendMessage(roomId, {
      sender_type: "ai",
      text: notice
    });

    const nextContext = resetContext();
    await api.updateContext(roomId, { context: nextContext });
    await api.clearConversation(roomId, message.seq);

    if (isCurrentRoom(roomId)) {
      update({ room: Object.assign({}, state.room, { context: nextContext }) });
      replaceMessages([message]);
      showMessages();
    }

    document.dispatchEvent(new CustomEvent("haisen:products-changed"));
    if (window.toast) window.toast(notice);
  } catch (error) {
    if (window.toast) window.toast(error && error.message ? error.message : "上架失敗，請再試一次");
    if (isCurrentRoom(roomId)) ui.notify(error);
  } finally {
    update({ publishing: false });
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
