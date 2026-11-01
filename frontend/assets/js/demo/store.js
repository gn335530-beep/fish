/* 前端共用狀態。任何變更都會通知訂閱者重繪，不做虛擬 DOM。 */

export function emptyProposal() {
  return { quantity: "", final_price: "", meetup_location: "", meetup_time: "" };
}

export function emptyState() {
  return {
    user: null,
    conversations: [],
    room: null,
    messages: [],
    lastSeq: 0,
    view: "assistant",
    notice: "",
    deal: null,
    addonOpen: false,
    addons: [],
    addonQty: {},
    proposeOpen: false,
    proposal: emptyProposal(),
    reviewDrafts: {},
    marketDays: {},
    marketWeights: {},
    marketUnits: {}
  };
}

export const state = emptyState();

const listeners = [];

export function subscribe(listener) {
  listeners.push(listener);
}

export function update(patch) {
  Object.assign(state, patch);
  listeners.forEach(function (listener) { listener(); });
}

/* 未讀總數：只計算對方傳來的訊息。 */
export function totalUnread() {
  return state.conversations.reduce(function (sum, room) {
    return sum + (Number(room.unread_count) || 0);
  }, 0);
}

function cursorOf(messages) {
  return (messages || []).reduce(function (max, message) {
    return Math.max(max, Number(message && message.seq) || 0);
  }, 0);
}

function hasMessage(messages, candidate) {
  if (!candidate) return false;
  const seq = Number(candidate.seq) || 0;
  if (seq > 0) {
    return messages.some(function (message) { return (Number(message.seq) || 0) === seq; });
  }
  if (candidate.id == null) return false;
  return messages.some(function (message) {
    return message.id != null && String(message.id) === String(candidate.id);
  });
}

/* 以完整清單取代訊息；游標取最大序號，不依賴陣列最後一筆。 */
export function replaceMessages(messages, changes) {
  const next = (messages || []).slice();
  update(Object.assign({}, changes || {}, { messages: next, lastSeq: cursorOf(next) }));
  return next;
}

/* 追加訊息並去重：有 seq 比 seq，缺 seq 時退回訊息識別碼。 */
export function appendMessages(messages) {
  const next = state.messages.slice();
  (messages || []).forEach(function (message) {
    if (!message || hasMessage(next, message)) return;
    next.push(message);
  });
  if (next.length === state.messages.length) return state.messages;
  update({ messages: next, lastSeq: cursorOf(next) });
  return next;
}
