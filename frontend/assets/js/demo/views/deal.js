/* 交易房視圖：訂單摘要與訊息流；對方完全沒有商品時不顯示浮動購物車。 */

import { state } from "../store.js";
import { renderMessages } from "./messages.js";
import { renderDealStrip } from "./deal-strip.js";
import { isDraft } from "../deal-state.js";
import { preferredOrder } from "../room-order.js";

function peerHasProducts(deal, room) {
  if (room && typeof room.has_products === "boolean") return room.has_products;
  if (deal && typeof deal.has_products === "boolean") return deal.has_products;
  return true;
}

export function renderDealRoom() {
  const room = state.room || {};
  const deal = state.deal;
  const items = (deal && deal.items) || [];
  const hasOrder = !!deal || !!preferredOrder(room) ||
    ((room.orders || []).length > 0);
  const emptyDraft = !!deal && isDraft(deal) && !items.length;
  const showCart = hasOrder && !(emptyDraft && !peerHasProducts(deal, room));

  const chat = renderMessages() ||
    '<div class="fm-empty"><p>已開啟交易房，可以直接傳訊息約面交。</p></div>';
  return (showCart ? renderDealStrip() : "") + chat;
}
