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

export async function refreshMessages() {
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

async function tick() {
  if (running || !state.user) return;
  running = true;
  try {
    await refreshRooms();
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

export function stopPolling() {
  if (timer) window.clearInterval(timer);
  timer = null;
}

export function pollNow() {
  return tick();
}
