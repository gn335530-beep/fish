/* 交易房互動：發送交易、批次加購與協議確認。 */

import { state, update, emptyProposal } from "./store.js";
import * as api from "./api.js";
import { reloadRoom, respondToDeal } from "./deal-replies.js";
import { handleReviewAction } from "./deal-reviews.js";
import {
  initOrderActions, toggleAddon, closeAddon, submitAddon
} from "./deal-order-actions.js";
import { initCartActions, handleCartAction } from "./deal-cart-actions.js";
import {
  initCancelActions, openCancel, dismissCancel, submitCancel
} from "./deal-cancel-actions.js";
import { canEditDeal, isBuyerOf, isReopenableDeal } from "./deal-state.js";
import { totalQuantity } from "./views/deal-item-text.js";
import { localInputOf } from "./views/html.js";

let ui = {
  render: function () {},
  notify: function () {},
  scrollEnd: function () {}
};
export function initDealActions(options) {
  ui = Object.assign(ui, options || {});
  initOrderActions(options);
  initCartActions(options);
  initCancelActions(options);
}

function canEdit() {
  return canEditDeal(state.deal, state.user);
}

function openPropose() {
  const deal = state.deal;
  if (!canEdit()) return ui.notify(new Error("只有草稿訂單可以發送交易"));
  const items = deal.items || [];
  if (!items.length) return ui.notify(new Error("請先加入商品"));

  const single = items.length === 1;
  const tails = totalQuantity(items);
  const terms = deal.deal_terms || {};
  const current = state.proposal || {};
  const blank = !current.quantity && !current.final_price &&
    !current.meetup_location && !current.meetup_time;
  const defaults = Object.assign(emptyProposal(), {
    quantity: single ? String(items[0].quantity) : String(tails),
    final_price: String(terms.final_price || deal.items_total || ""),
    meetup_location: terms.meetup_location || "",
    meetup_time: localInputOf(terms.meetup_time)
  });
  update({
    proposeOpen: true,
    addonOpen: false,
    addons: [],
    addonQty: {},
    proposal: blank ? defaults : current
  });
  ui.render();
}

function closeSheet() {
  if (state.addonOpen) {
    closeAddon();
    return;
  }
  update({ proposeOpen: false });
  ui.render();
}

async function startProposal() {
  const deal = state.deal;
  if (isBuyerOf(deal, state.user) && isReopenableDeal(deal)) {
    try {
      await api.reinitiateDeal(deal.id);
      await reloadRoom();
      openPropose();
    } catch (error) {
      ui.notify(error);
    }
    return;
  }
  openPropose();
}

async function submitProposal() {
  const deal = state.deal;
  if (!canEdit()) return ui.notify(new Error("只有草稿訂單可以發送交易"));
  const proposal = state.proposal || {};
  const items = deal.items || [];
  const single = items.length === 1;
  let quantity = null;

  if (single) {
    quantity = Number(proposal.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return ui.notify(new Error("請填寫數量"));
    }
    const max = Number(items[0].available || 0);
    if (quantity > max) {
      return ui.notify(new Error("數量不可超過可售 " + max + " 尾"));
    }
  }

  const finalPrice = Math.round(Number(proposal.final_price));
  const meetupLocation = String(proposal.meetup_location || "").trim();
  const meetupTime = String(proposal.meetup_time || "");
  const when = new Date(meetupTime);

  if (!(finalPrice > 0)) return ui.notify(new Error("請填寫售價"));
  if (!meetupLocation) return ui.notify(new Error("請填寫面交地點"));
  if (!meetupTime || isNaN(when.getTime())) return ui.notify(new Error("請填寫面交時間"));

  try {
    if (single && quantity !== Number(items[0].quantity)) {
      await api.updateDealItem(deal.id, items[0].item_id, quantity);
    }
    await api.proposeDeal(deal.id, {
      final_price: finalPrice,
      meetup_location: meetupLocation,
      meetup_time: when.toISOString()
    });
    update({ proposeOpen: false, proposal: emptyProposal() });
    await reloadRoom();
  } catch (error) {
    ui.notify(error);
  }
}

/* 表單值直接寫回 state，不觸發重繪，避免每 3 秒輪詢時游標跳動。 */
export function handleFieldInput(field, value) {
  if (!state.proposal || !(field in state.proposal)) return;
  state.proposal[field] = value;
}

/* 加購的尾數要留在 state，否則輪詢重繪會回到空白。 */
export function handleAddonSelect(productId, value) {
  state.addonQty = state.addonQty || {};
  state.addonQty[productId] = value;
}

export async function handleDealAction(action, data) {
  if (await handleReviewAction(action, data)) return true;
  if (await handleCartAction(action, data)) return true;
  if (action === "toggle-propose") {
    await startProposal();
    return true;
  }
  if (action === "close-sheet") {
    closeSheet();
    return true;
  }
  if (action === "toggle-addon") {
    await toggleAddon();
    return true;
  }
  if (action === "addon-cancel") {
    closeAddon();
    return true;
  }
  if (action === "addon-submit") {
    await submitAddon();
    return true;
  }
  if (action === "submit-proposal") {
    await submitProposal();
    return true;
  }
  if (action === "deal-cancel-open") {
    openCancel(data.deal);
    return true;
  }
  if (action === "cancel-dismiss") {
    dismissCancel();
    return true;
  }
  if (action === "cancel-submit") {
    await submitCancel(data.deal);
    return true;
  }
  if (action === "deal-agree") {
    await respondToDeal(data.deal, "AGREE");
    return true;
  }
  return false;
}
