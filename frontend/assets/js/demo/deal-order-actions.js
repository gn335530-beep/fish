/* 訂單項目：重新載入房間與批次加購。 */

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
    closeAddon();
    return;
  }
  const deal = state.deal;
  if (!deal) return;
  try {
    const rows = await listProducts({ seller_id: deal.seller_id, limit: 100 });
    update({ addonOpen: true, proposeOpen: false, addons: rows || [], addonQty: {} });
    ui.render();
  } catch (error) {
    ui.notify(error);
  }
}

export function closeAddon() {
  update({ addonOpen: false, addonQty: {} });
  ui.render();
}

function maxAddableOf(product) {
  const inDraft = (state.deal.items || []).reduce(function (sum, item) {
    return String(item.product_id) === String(product.id) ? sum + Number(item.quantity || 0) : sum;
  }, 0);
  return Math.max(0, Number(product.available || 0) - inDraft);
}

export async function submitAddon() {
  const deal = state.deal;
  if (!deal) return;
  const items = [];
  const rows = state.addons || [];
  for (const product of rows) {
    const quantity = Number((state.addonQty || {})[product.id]) || 0;
    if (quantity <= 0) continue;
    if (quantity > maxAddableOf(product)) {
      ui.notify(new Error("「" + (product.fish_species || product.title) + "」加購數量超過可再加購尾數"));
      return;
    }
    items.push({ product_id: product.id, quantity: quantity });
  }
  if (!items.length) {
    ui.notify(new Error("請選擇要加購的數量"));
    return;
  }
  try {
    await api.addDealItemsBatch(deal.id, items);
    closeAddon();
    await refreshDeal();
  } catch (error) {
    ui.notify(error);
  }
}
