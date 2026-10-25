/* 交易房視圖：電話橫幅、訂單摘要與訊息流。 */

import { state } from "../store.js";
import { escapeHtml, money } from "./html.js";
import { renderMessages } from "./messages.js";

const STATUS_LABEL = {
  DRAFT: "訂單草稿",
  PENDING_REVIEW: "等待對方回覆",
  NEGOTIATING: "協商中",
  CONFIRMED: "已成交",
  CANCELLED: "已取消"
};

function phoneBanner() {
  const peer = state.room.peer || {};
  const phone = String(peer.username || "").trim();
  const link = phone
    ? '<a class="fm-deal__phone" href="tel:' + escapeHtml(phone) + '">☎ ' + escapeHtml(phone) + '</a>'
    : '<span class="fm-deal__phone">電話未提供</span>';
  return '<div class="fm-deal__bar">' +
    '<div class="fm-deal__peer"><b>' + escapeHtml(peer.display_name || "對方") + '</b>' +
    '<span>交易房</span></div>' +
    link +
    '</div>';
}

function orderSummary() {
  const order = state.room.order;
  if (!order) {
    return '<div class="fm-deal__order"><span>尚無訂單項目</span></div>';
  }
  return '<div class="fm-deal__order">' +
    '<b>' + escapeHtml(STATUS_LABEL[order.status] || "訂單") + '</b>' +
    '<span>' + Number(order.item_count || 0) + ' 項 · ' +
    Number(order.total_quantity || 0) + ' 尾 · ' + money(order.final_price) + '</span>' +
    '</div>';
}

export function renderDealRoom() {
  const chat = renderMessages() ||
    '<div class="fm-empty"><p>已開啟交易房，可以直接傳訊息約面交。</p></div>';
  return phoneBanner() + orderSummary() + chat;
}
