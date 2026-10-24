/* 收件匣：助手房與進行中的交易房。 */

import { state } from "../store.js";
import { escapeHtml, timeOf, initials } from "./html.js";

function orderLine(room) {
  if (room.type === "assistant") return "AI 對話";
  if (!room.order) return "洽談中";
  const label = {
    DRAFT: "訂單草稿",
    PENDING_REVIEW: "等待確認",
    NEGOTIATING: "協商中"
  }[room.order.status] || "洽談中";
  return label + " · " + room.order.item_count + " 項 · " + room.order.total_quantity + " 尾";
}

function item(room) {
  const unread = Number(room.unread_count) || 0;
  const last = room.last_message;
  const preview = last ? (last.text || (last.type === "image" ? "（圖片）" : "（卡片）")) : "尚無訊息";
  return '<button type="button" class="fm-inbox__item' + (state.room && state.room.id === room.id ? " on" : "") + '"' +
    ' data-action="room" data-room="' + escapeHtml(room.id) + '">' +
    '<span class="fm-inbox__avatar">' + escapeHtml(initials(room.type === "assistant" ? "魚" : room.peer.display_name)) + '</span>' +
    '<span class="fm-inbox__body">' +
    '<span class="fm-inbox__top"><b>' + escapeHtml(room.type === "assistant" ? "小幫手" : room.peer.display_name) + '</b>' +
    '<em>' + escapeHtml(timeOf(room.last_message_at || room.created_at)) + '</em></span>' +
    '<span class="fm-inbox__sub">' + escapeHtml(orderLine(room)) + '</span>' +
    '<span class="fm-inbox__preview">' + escapeHtml(preview) + '</span>' +
    '</span>' +
    (unread > 0 ? '<span class="fm-inbox__dot">' + unread + '</span>' : '') +
    '</button>';
}

export function renderInbox() {
  const head = '<div class="fm-inbox__head"><b>收件匣</b>' +
    '<button type="button" class="fm-link" data-action="back">返回對話</button></div>';

  const rooms = state.conversations || [];
  if (!rooms.length) {
    return head + '<div class="fm-empty"><p>目前沒有對話。</p></div>';
  }
  return head + '<div class="fm-inbox">' + rooms.map(item).join("") + '</div>';
}
