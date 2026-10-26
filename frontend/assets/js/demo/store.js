/* 前端共用狀態。任何變更都會通知訂閱者重繪，不做虛擬 DOM。 */

export function emptyProposal() {
  return { final_price: "", meetup_location: "", meetup_time: "" };
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
    dealOpen: true,
    addonOpen: false,
    addons: [],
    addonQty: {},
    proposeOpen: false,
    proposal: emptyProposal(),
    cancelReasons: {},
    reviewDrafts: {},
    marketDays: {}
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
