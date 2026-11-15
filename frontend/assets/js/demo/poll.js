/* 3 秒輪詢：對話清單與當前房間的增量訊息。分頁隱藏時暫停。 */

import * as api from "./api.js";
import { state, update, appendMessages } from "./store.js";

const INTERVAL = 3000;

let timer = null;
let running = false;

export async function refreshRooms() {
  const conversations = await api.listConversations();
  /* 資料沒變就不通知，避免每 3 秒重畫正在輸入的畫面。 */
  if (JSON.stringify(conversations) === JSON.stringify(state.conversations || [])) {
    return conversations;
  }
  update({ conversations: conversations });
  return conversations;
}

async function refreshMessages() {
  if (!state.room) return [];
  const messages = await api.listMessages(state.room.id, state.lastSeq);
  appendMessages(messages);
  return messages;
}

/* 目前的房間摘要（訂單項目數、金額）也要跟著別人的加購更新。 */
export async function syncOpenRoom() {
  if (!state.room) return;
  const fresh = (state.conversations || []).find(function (item) {
    return item.id === state.room.id;
  });
  if (!fresh) return;

  const order = fresh.order || null;
  const lastOrder = fresh.last_order || null;
  const orders = fresh.orders || [];
  const changed = JSON.stringify(order) !== JSON.stringify(state.room.order || null) ||
    JSON.stringify(lastOrder) !== JSON.stringify(state.room.last_order || null) ||
    JSON.stringify(orders) !== JSON.stringify(state.room.orders || []);
  if (changed) {
    update({
      room: Object.assign({}, state.room, {
        order: order,
        last_order: lastOrder,
        orders: orders,
        peer: fresh.peer,
        mode: fresh.mode
      })
    });
  }

  /* 已結束的訂單不在 order 裡，last_order 的狀態或更新時間有變就重取。 */
  if (fresh.type !== "deal" || !lastOrder) return;
  const deal = state.deal;
  const stale = !deal ||
    String(deal.id) !== String(lastOrder.id) ||
    String(deal.deal_status || "") !== String(lastOrder.status || "") ||
    String(deal.updated_at || "") !== String(lastOrder.updated_at || "");
  if (!stale) return;
  try {
    update({ deal: await api.getDeal(lastOrder.id) });
  } catch (error) {
    /* 訂單明細載入失敗時，摘要仍然可用。 */
  }
}

async function tick() {
  if (running || !state.user) return;
  running = true;
  const openRoomId = state.room ? state.room.id : null;
  try {
    const conversations = await refreshRooms();
    /* 對方刪除房間後，離開已不存在的房間，避免後續訊息請求一直 404。
       只處理同一個房間；輪詢期間切換到新房時不要誤清。 */
    if (openRoomId && state.room && state.room.id === openRoomId &&
      !(conversations || []).some(function (room) {
        return room.id === openRoomId;
      })) {
      const notice = "這間對話已被刪除";
      update({
        room: null,
        messages: [],
        lastSeq: 0,
        deal: null,
        view: "inbox",
        notice: notice
      });
      if (window.setTimeout) {
        window.setTimeout(function () {
          if (state.notice === notice) update({ notice: "" });
        }, 4000);
      }
      return;
    }
    await syncOpenRoom();
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
