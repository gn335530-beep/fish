/* 協議回應與取消：同意、退回、取消後重新載入房間。 */

import * as api from "./api.js";
import { refreshRooms } from "./poll.js";
import { openRoom, currentRoom } from "./rooms.js";
import { state } from "./store.js";

let ui = {
  render: function () {},
  notify: function () {},
  scrollEnd: function () {}
};

export function initDealReplies(options) {
  ui = Object.assign(ui, options || {});
}

export async function reloadRoom() {
  await refreshRooms();
  await openRoom(currentRoom());
  ui.render();
  ui.scrollEnd();
}

export async function respondToDeal(dealId, action) {
  try {
    await api.respondDeal(dealId, action);
    await reloadRoom();
  } catch (error) {
    ui.notify(error);
  }
}

export async function cancelDeal(dealId) {
  const reason = (state.cancelReasons || {})[dealId];
  if (!reason) {
    ui.notify(new Error("請選擇取消原因"));
    return;
  }
  try {
    await api.cancelDeal(dealId, reason);
    await reloadRoom();
  } catch (error) {
    ui.notify(error);
  }
}

/* 取消原因跟著協議卡走，輪詢重繪不會把選好的原因跳回第一項。 */
export function handleCancelReason(dealId, value) {
  state.cancelReasons = state.cancelReasons || {};
  state.cancelReasons[dealId] = value;
}
