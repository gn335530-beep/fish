/* 訂單項目 UI 操作：移除與改尾數；兩者都不留系統訊息。 */

import { state } from "./store.js";
import * as api from "./api.js";
import { refreshDeal } from "./deal-order-actions.js";

let ui = {
  notify: function () {}
};

export function initCartActions(options) {
  ui = Object.assign(ui, options || {});
}

async function applyChange(change) {
  const deal = state.deal;
  if (!deal) return;
  try {
    await change(deal);
    await refreshDeal();
  } catch (error) {
    ui.notify(error);
  }
}

export function removeDealItem(itemId) {
  return applyChange(function (deal) {
    return api.deleteDealItem(deal.id, itemId);
  });
}

export async function setDealItemQuantity(itemId, value) {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1) {
    ui.notify(new Error("請填寫正確尾數"));
    await refreshDeal();
    return;
  }
  await applyChange(function (deal) {
    return api.updateDealItem(deal.id, itemId, quantity);
  });
}

export async function handleCartAction(action, data) {
  if (action === "item-remove") {
    await removeDealItem(data.item);
    return true;
  }
  if (action === "item-qty") {
    await setDealItemQuantity(data.item, data.value);
    return true;
  }
  return false;
}
