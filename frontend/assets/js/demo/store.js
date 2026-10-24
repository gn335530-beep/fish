/* 前端共用狀態。任何變更都會通知訂閱者重繪，不做虛擬 DOM。 */

export const state = {
  user: null,
  conversations: [],
  room: null,
  messages: [],
  lastSeq: 0,
  view: "assistant",
  busy: false,
  notice: ""
};

const listeners = [];

export function subscribe(listener) {
  listeners.push(listener);
}

export function update(patch) {
  Object.assign(state, patch);
  listeners.forEach(function (listener) { listener(); });
}

export function resetRoom() {
  update({ room: null, messages: [], lastSeq: 0 });
}

/* 未讀總數：只計算對方傳來的訊息。 */
export function totalUnread() {
  return state.conversations.reduce(function (sum, room) {
    return sum + (Number(room.unread_count) || 0);
  }, 0);
}
