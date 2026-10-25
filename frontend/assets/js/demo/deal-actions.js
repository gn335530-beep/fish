/* 訂單摘要的互動：展開、加購、改量、刪除、清空與送出協議。 */

import { state, update, emptyProposal } from "./store.js";
import * as api from "./api.js";
import { refreshRooms } from "./poll.js";
import { openRoom } from "./rooms.js";

let ui = {
  render: function () {},
  notify: function () {},
  scrollEnd: function () {}
};

export function initDealActions(options) {
  ui = Object.assign(ui, options || {});
}

function currentRoom() {
  return (state.conversations || []).find(function (item) {
    return item.id === state.room.id;
  }) || state.room;
}

async function refreshDeal() {
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

async function toggleAddon() {
  if (state.addonOpen) {
    update({ addonOpen: false, addons: [], addonQty: {} });
    ui.render();
    return;
  }

  const deal = state.deal;
  if (!deal) return;
  try {
    const rows = await api.listProducts({ seller_id: deal.seller_id, limit: 100 });
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

async function addItem(productId) {
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

async function changeQuantity(itemId, quantity) {
  if (quantity < 1) return;
  try {
    await api.updateDealItem(state.deal.id, itemId, quantity);
    await refreshDeal();
  } catch (error) {
    ui.notify(error);
  }
}

async function removeItem(itemId) {
  try {
    await api.removeDealItem(state.deal.id, itemId);
    await refreshDeal();
  } catch (error) {
    ui.notify(error);
  }
}

async function clearItems() {
  try {
    await api.clearDealItems(state.deal.id);
    await refreshDeal();
  } catch (error) {
    ui.notify(error);
  }
}

function togglePropose() {
  if (state.proposeOpen) {
    update({ proposeOpen: false });
    ui.render();
    return;
  }
  const deal = state.deal;
  if (!deal || !(deal.items || []).length) return;
  update({
    proposeOpen: true,
    proposal: Object.assign(emptyProposal(), {
      final_price: String(deal.items_total || "")
    })
  });
  ui.render();
}

async function submitProposal() {
  const proposal = state.proposal || {};
  const finalPrice = Math.round(Number(proposal.final_price));
  const meetupLocation = String(proposal.meetup_location || "").trim();
  const meetupTime = String(proposal.meetup_time || "");
  const when = new Date(meetupTime);

  if (!(finalPrice > 0)) return ui.notify(new Error("請填寫整單金額"));
  if (!meetupLocation) return ui.notify(new Error("請填寫面交地點"));
  if (!meetupTime || isNaN(when.getTime())) return ui.notify(new Error("請填寫面交時間"));

  try {
    await api.proposeDeal(state.deal.id, {
      final_price: finalPrice,
      meetup_location: meetupLocation,
      meetup_time: when.toISOString()
    });
    update({ proposeOpen: false });
    await refreshRooms();
    await openRoom(currentRoom());
    ui.render();
    ui.scrollEnd();
  } catch (error) {
    ui.notify(error);
  }
}

/* 表單值直接寫回 state，不觸發重繪，避免每 3 秒輪詢時游標跳動。 */
export function handleFieldInput(field, value) {
  if (!state.proposal || !(field in state.proposal)) return;
  state.proposal[field] = value;
}

/* 加購的尾數選擇也要留在 state，否則輪詢重繪會回到 1 尾。 */
export function handleAddonSelect(productId, value) {
  state.addonQty = state.addonQty || {};
  state.addonQty[productId] = value;
}

export async function handleDealAction(action, data) {
  if (action === "toggle-order") {
    update({ dealOpen: !state.dealOpen });
    ui.render();
    return true;
  }
  if (action === "toggle-addon") {
    await toggleAddon();
    return true;
  }
  if (action === "add-item") {
    await addItem(data.product);
    return true;
  }
  if (action === "qty-up" || action === "qty-down") {
    const delta = action === "qty-up" ? 1 : -1;
    await changeQuantity(data.item, Number(data.qty) + delta);
    return true;
  }
  if (action === "remove-item") {
    await removeItem(data.item);
    return true;
  }
  if (action === "clear-items") {
    await clearItems();
    return true;
  }
  if (action === "toggle-propose") {
    togglePropose();
    return true;
  }
  if (action === "submit-proposal") {
    await submitProposal();
    return true;
  }
  return false;
}
