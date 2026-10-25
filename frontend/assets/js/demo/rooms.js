/* 房間切換：載入訊息、標記已讀並決定視圖。 */

import { state, update, emptyProposal } from "./store.js";
import * as api from "./api.js";

export function viewOf(room) {
  return room && room.type === "deal" ? "deal" : "assistant";
}

export function currentRoom() {
  if (!state.room) return null;
  return (state.conversations || []).find(function (item) {
    return item.id === state.room.id;
  }) || state.room;
}

export function clearUnread(conversations, roomId) {
  return (conversations || []).map(function (item) {
    return item.id === roomId ? Object.assign({}, item, { unread_count: 0 }) : item;
  });
}

async function loadDeal(deal) {
  if (!deal) return null;
  try {
    return await api.getDeal(deal.id);
  } catch (error) {
    return null;
  }
}

export async function openRoom(room) {
  const messages = await api.listMessages(room.id, 0);
  const last = messages[messages.length - 1];
  const deal = room.type === "deal" && room.order ? await loadDeal(room.order) : null;
  update({
    room: room,
    messages: messages,
    lastSeq: last ? Number(last.seq) : 0,
    view: viewOf(room),
    deal: deal,
    dealOpen: true,
    addonOpen: false,
    addons: [],
    addonQty: {},
    proposeOpen: false,
    proposal: emptyProposal(),
    cancelReasons: {},
    reviewDrafts: {}
  });
  await api.markRead(room.id);
  update({ conversations: clearUnread(state.conversations, room.id) });
  return room;
}
