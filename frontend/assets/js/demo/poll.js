/* 3 秒輪詢：對話清單與當前房間的增量訊息。分頁隱藏時暫停。 */

import * as api from "./api.js";
import { state, update } from "./store.js";

const INTERVAL = 3000;

let timer = null;
let running = false;

export async function refreshRooms() {
  const conversations = await api.listConversations();
  update({ conversations: conversations });
  return conversations;
}

async function refreshMessages() {
  if (!state.room) return [];
  const messages = await api.listMessages(state.room.id, state.lastSeq);
  if (messages.length) {
    const last = messages[messages.length - 1];
    update({
      messages: state.messages.concat(messages),
      lastSeq: Number(last.seq) || state.lastSeq
    });
  }
  return messages;
}

/* 目前的房間摘要（訂單項目數、金額）也要跟著別人的加購更新。 */
export function syncOpenRoom() {
  if (!state.room) return;
  const fresh = (state.conversations || []).find(function (item) {
    return item.id === state.room.id;
  });
  if (!fresh) return;
  const order = fresh.order || null;
  if (JSON.stringify(order) === JSON.stringify(state.room.order || null)) return;
  update({
    room: Object.assign({}, state.room, {
      order: order,
      peer: fresh.peer,
      mode: fresh.mode
    })
  });
}

async function tick() {
  if (running || !state.user) return;
  running = true;
  try {
    await refreshRooms();
    syncOpenRoom();
    if (state.room && state.view !== "inbox") await refreshMessages();
  } catch (error) {
    update({ notice: error && error.message ? error.message : "" });
  } finally {
    running = false;
  }
}

export function startPolling() {
  stopPolling();
  timer = window.setInterval(function () {
    if (!document.hidden) tick();
  }, INTERVAL);
}

function stopPolling() {
  if (timer) window.clearInterval(timer);
  timer = null;
}

export function pollNow() {
  return tick();
}
