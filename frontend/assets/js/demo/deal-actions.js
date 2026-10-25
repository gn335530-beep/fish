/* 訂單摘要的互動：展開、加購、改量、刪除、清空與送出協議。 */

import { state, update, emptyProposal } from "./store.js";
import * as api from "./api.js";
import { reloadRoom, respondToDeal, cancelDeal } from "./deal-replies.js";
import {
  initOrderActions, toggleAddon, addItem, changeQuantity, removeItem, clearItems
} from "./deal-order-actions.js";
import { localInputOf } from "./views/html.js";

let ui = {
  render: function () {},
  notify: function () {},
  scrollEnd: function () {}
};

export function initDealActions(options) {
  ui = Object.assign(ui, options || {});
  initOrderActions(options);
}

function togglePropose() {
  if (state.proposeOpen) {
    update({ proposeOpen: false });
    ui.render();
    return;
  }
  const deal = state.deal;
  if (!deal || !(deal.items || []).length) return;
  const terms = deal.deal_terms || {};
  update({
    proposeOpen: true,
    proposal: Object.assign(emptyProposal(), {
      final_price: String(terms.final_price || deal.items_total || ""),
      meetup_location: terms.meetup_location || "",
      meetup_time: localInputOf(terms.meetup_time)
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
  if (action === "deal-agree" || action === "deal-reject") {
    await respondToDeal(data.deal, action === "deal-agree" ? "AGREE" : "REJECT");
    return true;
  }
  if (action === "deal-cancel") {
    await cancelDeal(data.deal);
    return true;
  }
  return false;
}
