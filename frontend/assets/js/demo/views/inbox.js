/* 收件匣：助手房與交易房清單；可新增助手房，刪除可刪的房間。 */

import { state } from "../store.js";
import { roomLabel } from "../rooms.js";
import { escapeHtml, timeOf, initials, NO_ASSISTANT_TEXT } from "./html.js";

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

function deleteButton(room) {
  if (!room.deletable) return "";
  const label = "刪除" + roomLabel(room);
  return '<button type="button" class="fm-inbox__del" data-action="delete-room" data-room="' +
    escapeHtml(room.id) + '" aria-label="' + label + '" title="' + label + '">✕</button>';
}

function item(room) {
  const unread = Number(room.unread_count) || 0;
  const last = room.last_message;
  const preview = last ? (last.text || (last.type === "image" ? "（圖片）" : "（卡片）")) : "尚無訊息";
  return '<div class="fm-inbox__item' + (state.room && state.room.id === room.id ? " on" : "") + '">' +
    '<button type="button" class="fm-inbox__open" data-action="room" data-room="' + escapeHtml(room.id) + '">' +
    '<span class="fm-inbox__avatar">' + escapeHtml(initials(room.type === "assistant" ? "魚" : room.peer.display_name)) + '</span>' +
    '<span class="fm-inbox__body">' +
    '<span class="fm-inbox__top"><b>' + escapeHtml(room.type === "assistant" ? "小幫手" : room.peer.display_name) + '</b>' +
    '<em>' + escapeHtml(timeOf(room.last_message_at || room.created_at)) + '</em></span>' +
    '<span class="fm-inbox__sub">' + escapeHtml(orderLine(room)) + '</span>' +
    '<span class="fm-inbox__preview">' + escapeHtml(preview) + '</span>' +
    '</span>' +
    (unread > 0 ? '<span class="fm-inbox__dot">' + unread + '</span>' : '') +
    '</button>' +
    deleteButton(room) +
    '</div>';
}

function emptyBox(message) {
  return '<div class="fm-empty"><p>' + escapeHtml(message) + '</p>' +
    '<button type="button" class="fm-chip" data-action="new-assistant">新增 AI 對話</button></div>';
}

export function renderInbox() {
  const head = '<div class="fm-inbox__head"><b>收件匣</b>' +
    '<span class="fm-inbox__acts">' +
    '<button type="button" class="fm-link" data-action="new-assistant">新增 AI 對話</button>' +
    '<button type="button" class="fm-link" data-action="back">返回對話</button></span></div>';

  const rooms = state.conversations || [];
  if (!rooms.length) return head + emptyBox(NO_ASSISTANT_TEXT);

  const hasAssistant = rooms.some(function (room) { return room.type === "assistant"; });
  const note = hasAssistant ? "" :
    '<p class="fm-inbox__note">' + escapeHtml(NO_ASSISTANT_TEXT) + '</p>';
  return head + note + '<div class="fm-inbox">' + rooms.map(item).join("") + '</div>';
}
