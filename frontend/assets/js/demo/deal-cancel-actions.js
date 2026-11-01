/* 協議取消：本地確認取消卡、自由文字原因與送出。 */

import { state, update } from "./store.js";
import * as api from "./api.js";
import { reloadRoom } from "./deal-replies.js";

let ui = {
  render: function () {},
  notify: function () {}
};

export function initCancelActions(options) {
  ui = Object.assign(ui, options || {});
}

export function handleCancelNote(value) {
  state.cancelNote = String(value || "");
}

export function openCancel(dealId) {
  update({ cancelOpen: String(dealId), cancelNote: "" });
  ui.render();
}

export function dismissCancel() {
  update({ cancelOpen: null, cancelNote: "" });
  ui.render();
}

export async function submitCancel(dealId) {
  const note = String(state.cancelNote || "").trim();
  if (!note) return ui.notify(new Error("請填寫取消原因"));
  try {
    await api.cancelDeal(dealId, note);
    update({ cancelOpen: null, cancelNote: "" });
    await reloadRoom();
  } catch (error) {
    ui.notify(error);
  }
}
