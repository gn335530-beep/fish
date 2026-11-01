/* 交易房前端測試共用資料。 */

import { update } from "../assets/js/demo/store.js";

export const ITEMS = [
  { item_id: "itm_01", product_id: "prd_a", title: "石斑（2尾 / 活體）", fish_species: "石斑", unit_price: 1400, price_per_taijin: 800, quantity: 2, available: 2 },
  { item_id: "itm_02", product_id: "prd_b", title: "嘉鱲（2尾 / 活體）", fish_species: "嘉鱲", unit_price: 1530, price_per_taijin: 900, quantity: 1, available: 2 }
];

export function draft() {
  return {
    id: "deal_1",
    conversation_id: "conv_1",
    buyer_id: 2,
    seller_id: 1,
    deal_status: "DRAFT",
    deal_terms: null,
    items_total: 4330,
    items: ITEMS.map(function (item) { return Object.assign({}, item); })
  };
}

export function reset(deal, userId) {
  update({
    user: { id: userId },
    room: { id: "conv_1", type: "deal", order: { id: deal.id, status: deal.deal_status } },
    deal: deal,
    addonOpen: false,
    addons: [],
    addonQty: {},
    proposeOpen: false,
    proposal: { quantity: "", final_price: "", meetup_location: "", meetup_time: "" },
    cancelOpen: null,
    cancelNote: ""
  });
}

export function pendingDeal(initiatorId) {
  const deal = draft();
  deal.deal_status = "PENDING_REVIEW";
  deal.initiator_id = initiatorId;
  deal.deal_terms = {
    final_price: 4800,
    meetup_location: "基隆火車站南站",
    meetup_time: "2026-10-26T09:30:00.000Z"
  };
  return deal;
}

export function cardOf(deal, status) {
  return {
    type: "deal",
    deal_id: deal.id,
    status: status,
    initiator_id: deal.initiator_id,
    final_price: 4800,
    meetup_location: "基隆火車站南站",
    meetup_time: "2026-10-26T09:30:00.000Z",
    items: [{ title: "石斑", fish_species: "石斑", quantity: 1, unit_price: 1400, price_per_taijin: 800 }]
  };
}
