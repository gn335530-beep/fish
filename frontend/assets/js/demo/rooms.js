/* 房間切換：載入訊息、標記已讀並決定視圖。 */

import { state, update } from "./store.js";
import * as api from "./api.js";

export function viewOf(room) {
  return room && room.type === "deal" ? "deal" : "assistant";
}

export function clearUnread(conversations, roomId) {
  return (conversations || []).map(function (item) {
    return item.id === roomId ? Object.assign({}, item, { unread_count: 0 }) : item;
  });
}

export async function openRoom(room) {
  const messages = await api.listMessages(room.id, 0);
  const last = messages[messages.length - 1];
  update({
    room: room,
    messages: messages,
    lastSeq: last ? Number(last.seq) : 0,
    view: viewOf(room)
  });
  await api.markRead(room.id);
  update({ conversations: clearUnread(state.conversations, room.id) });
  return room;
}
