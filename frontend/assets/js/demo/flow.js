/* 對話流程：送出訊息、上傳照片、發布草稿、商品諮詢。 */

import { state, update } from "./store.js";
import * as api from "./api.js";
import * as ai from "./ai/service.js";
import { draftToProduct } from "./ai/slots.js";
import { uploadImage } from "./upload.js";

let ui = {
  render: function () {},
  scrollEnd: function () {},
  notify: function () {}
};

export function initFlow(options) {
  ui = Object.assign(ui, options || {});
}

export async function ensureRoom() {
  const room = await api.ensureAssistant();
  const messages = await api.listMessages(room.id, 0);
  const last = messages[messages.length - 1];
  update({ room: room, messages: messages, lastSeq: last ? Number(last.seq) : 0, view: "assistant" });
  return room;
}

function appendMessages(list) {
  if (!list.length) return;
  const last = list[list.length - 1];
  update({
    messages: state.messages.concat(list),
    lastSeq: Number(last.seq) || state.lastSeq
  });
  ui.render();
  ui.scrollEnd();
}

async function runReplies(result) {
  const replies = result.replies || [];
  const created = [];

  for (let i = 0; i < replies.length; i++) {
    const reply = replies[i];
    const payload = { sender_type: "ai" };
    if (reply.text) payload.text = reply.text;
    if (reply.card) payload.card = reply.card;
    if (i === replies.length - 1 && result.context) payload.context = result.context;
    created.push(await api.sendMessage(state.room.id, payload));
  }

  if (result.context) {
    update({ room: Object.assign({}, state.room, { context: result.context }) });
  }
  appendMessages(created);
}

export async function submitText(text) {
  const value = String(text || "").trim();
  if (!value || !api.isLoggedIn()) return;

  try {
    if (!state.room) await ensureRoom();
    const message = await api.sendMessage(state.room.id, { text: value });
    appendMessages([message]);
    const result = await ai.handleText(state.room.context, value, state.user);
    await runReplies(result);
  } catch (error) {
    ui.notify(error);
  }
}

export async function submitPhoto(file) {
  if (!api.isLoggedIn()) return;
  try {
    if (!state.room) await ensureRoom();
    const url = await uploadImage(file);
    const message = await api.sendMessage(state.room.id, { image_url: url });
    appendMessages([message]);
    const result = ai.handlePhoto(state.room.context, url);
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

  try {
    const product = await api.createProduct(draftToProduct(draft, state.user));
    const message = await api.sendMessage(state.room.id, {
      sender_type: "ai",
      text: "已上架：" + product.title
    });

    const context = ai.resetContext();
    await api.updateContext(state.room.id, { context: context });
    await api.clearConversation(state.room.id, message.seq);

    update({
      messages: [message],
      lastSeq: Number(message.seq),
      room: Object.assign({}, state.room, { context: context })
    });
    ui.render();
    ui.scrollEnd();

    if (window.loadCatchFromApi) window.loadCatchFromApi();
    document.dispatchEvent(new CustomEvent("haisen:products-changed"));
    if (window.toast) window.toast("已上架：" + product.title);
  } catch (error) {
    ui.notify(error);
  }
}

export async function resetDraft() {
  try {
    const context = ai.resetContext();
    await api.updateContext(state.room.id, { context: context });
    update({ room: Object.assign({}, state.room, { context: context }) });
    await runReplies({ context: context, replies: [{ text: "已清空草稿，重新開始。" }] });
  } catch (error) {
    ui.notify(error);
  }
}

export async function explainProduct(productId) {
  try {
    const product = await api.getProduct(productId);
    await runReplies(ai.explainProduct(product, state.room.context));
  } catch (error) {
    ui.notify(error);
  }
}
