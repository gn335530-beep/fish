/* 訂單項目：加購、改量、刪除、清空與摘要重載。 */

import { state, update } from "./store.js";
import * as api from "./api.js";
import { listProducts } from "../api/products.js";
import { refreshRooms } from "./poll.js";
import { currentRoom } from "./rooms.js";

let ui = {
  render: function () {},
  notify: function () {},
  scrollEnd: function () {}
};

export function initOrderActions(options) {
  ui = Object.assign(ui, options || {});
}

export async function refreshDeal() {
  await refreshRooms();
  const room = currentRoom();
  let deal = null;
  if (room.order) {
    try {
      deal = await api.getDeal(room.order.id);
    } catch (error) {
      deal = state.deal;
    }
  }
  update({ room: room, deal: deal });
  ui.render();
  ui.scrollEnd();
}

export async function toggleAddon() {
  if (state.addonOpen) {
    update({ addonOpen: false, addons: [], addonQty: {} });
    ui.render();
    return;
  }

  const deal = state.deal;
  if (!deal) return;
  try {
    const rows = await listProducts({ seller_id: deal.seller_id, limit: 100 });
    const inOrder = (deal.items || []).map(function (item) { return item.product_id; });
    const addons = (rows || []).filter(function (product) {
      return Number(product.available) > 0 && inOrder.indexOf(product.id) === -1;
    });
    update({ addonOpen: true, addons: addons, addonQty: {} });
    ui.render();
  } catch (error) {
    ui.notify(error);
  }
}

export async function addItem(productId) {
  const stored = (state.addonQty || {})[productId];
  const select = document.querySelector('[data-addon-qty="' + productId + '"]');
  const quantity = Number(stored) || (select ? Number(select.value) : 1) || 1;
  try {
    await api.addDealItem(state.deal.id, productId, quantity);
    update({ addonOpen: false, addons: [], addonQty: {} });
    await refreshDeal();
  } catch (error) {
    ui.notify(error);
  }
}

export async function changeQuantity(itemId, quantity) {
  if (quantity < 1) return;
  try {
    await api.updateDealItem(state.deal.id, itemId, quantity);
    await refreshDeal();
  } catch (error) {
    ui.notify(error);
  }
}

export async function removeItem(itemId) {
  try {
    await api.removeDealItem(state.deal.id, itemId);
    await refreshDeal();
  } catch (error) {
    ui.notify(error);
  }
}

export async function clearItems() {
  try {
    await api.clearDealItems(state.deal.id);
    await refreshDeal();
  } catch (error) {
    ui.notify(error);
  }
}
