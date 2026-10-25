/* 面板動作分流：卡片按鈕、房間切換與洽談購買。 */

import { state, update } from "./store.js";
import * as api from "./api.js";
import { refreshRooms } from "./poll.js";
import { openRoom, viewOf } from "./rooms.js";
import { initDealActions, handleDealAction } from "./deal-actions.js";
import { initDealReplies } from "./deal-replies.js";
import {
  submitText, publishDraft, resetDraft, explainProduct, beginEdit, beginDeal
} from "./flow.js";

let panel = null;
let render = function () {};
let notify = function () {};

export function initActions(options) {
  panel = options.panel;
  render = options.render;
  notify = options.notify;
  initDealActions(options);
  initDealReplies(options);
}

function panelQuantity(productId) {
  const select = document.querySelector('.fm-card [data-fm-qty="' + productId + '"]');
  return select ? Number(select.value) || 1 : 1;
}

/* 商品卡與詳情頁的「洽談購買」入口；未登入先導去登入頁。 */
export async function startDeal(productId, quantity) {
  if (!api.isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }
  await beginDeal(productId, Number(quantity) || panelQuantity(productId));
  panel.open();
}

async function switchRoom(roomId) {
  const room = (state.conversations || []).find(function (item) { return item.id === roomId; });
  if (!room) return;
  await openRoom(room);
  render();
}

export async function handleAction(action, data) {
  if (action === "close" || action === "minimize") {
    panel.close();
    return;
  }
  if (action === "photo") return panel.openFilePicker();
  if (await handleDealAction(action, data)) return;
  if (action === "edit-slot") return beginEdit(data.slot);
  if (action === "publish") {
    publishDraft();
    return;
  }
  if (action === "reset-draft") {
    resetDraft();
    return;
  }
  if (action === "ask-product") {
    explainProduct(data.product);
    return;
  }
  if (action === "start-deal") {
    startDeal(data.product);
    return;
  }
  if (action === "inbox") {
    try {
      await refreshRooms();
      update({ view: "inbox" });
      render();
    } catch (error) {
      notify(error);
    }
    return;
  }
  if (action === "back") {
    update({ view: viewOf(state.room) });
    render();
    return;
  }
  if (action === "room") {
    try {
      await switchRoom(data.room);
    } catch (error) {
      notify(error);
    }
    return;
  }
  if (action === "hint") {
    submitText(data.value);
  }
}
