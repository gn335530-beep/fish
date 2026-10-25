/* 交易房視圖：電話橫幅、訂單摘要與訊息流。 */

import { state } from "../store.js";
import { escapeHtml } from "./html.js";
import { renderMessages } from "./messages.js";
import { renderDealOrder } from "./deal-order.js";

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

export function renderDealRoom() {
  const chat = renderMessages() ||
    '<div class="fm-empty"><p>已開啟交易房，可以直接傳訊息約面交。</p></div>';
  return phoneBanner() + renderDealOrder() + chat;
}
