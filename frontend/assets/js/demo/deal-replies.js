/* 協議回應：同意後重新載入房間。 */

import * as api from "./api.js";
import { refreshRooms } from "./poll.js";
import { openRoom, currentRoom } from "./rooms.js";

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
