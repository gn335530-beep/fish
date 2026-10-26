/* 草稿修改、取消上架與法規確認的對話動作。 */

import { state, update } from "./store.js";
import * as api from "./api.js";
import * as ai from "./ai/service.js";
import { deleteConversation } from "./rooms.js";
import { runReplies } from "./flow.js";

let ui = {
  render: function () {},
  notify: function () {}
};

export function initListingActions(options) {
  ui = Object.assign(ui, options || {});
}

export async function editDraft() {
  if (!state.room) return;
  try {
    await runReplies(ai.askDraftEdit(state.room.context));
  } catch (error) {
    ui.notify(error);
  }
}

export async function cancelListing() {
  if (!state.room) return;
  try {
    await runReplies(ai.requestCancel(state.room.context));
  } catch (error) {
    ui.notify(error);
  }
}

export async function dismissCancelListing() {
  if (!state.room) return;
  try {
    await runReplies(ai.dismissCancel(state.room.context));
  } catch (error) {
    ui.notify(error);
  }
}

export async function confirmCancelListing() {
  if (!state.room) return;
  try {
    await deleteConversation(state.room.id, { confirm: false });
    update({ view: "inbox" });
    ui.render();
  } catch (error) {
    ui.notify(error);
  }
}

export async function acceptSellerConsent() {
  const context = state.room && state.room.context;
  if (!context || context.awaiting_consent !== true) return;
  try {
    const payload = await api.sellerConsent();
    if (!payload || !payload.user) throw new Error("無法記錄販賣確認，請稍後再試");
    update({ user: payload.user });
    await runReplies(await ai.resumeAfterConsent(context, payload.user));
  } catch (error) {
    ui.notify(error);
  }
}

export async function declineSellerConsent() {
  const context = state.room && state.room.context;
  if (!context || context.awaiting_consent !== true) return;
  try {
    await runReplies(ai.declineConsent(context));
  } catch (error) {
    ui.notify(error);
  }
}
