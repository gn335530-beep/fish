/* 訊息氣泡：助手房與交易房共用同一套呈現。 */

import { state } from "../store.js";
import { escapeHtml, timeOf, resolveImage } from "./html.js";
import { renderCard } from "./cards.js";

function bubble(message) {
  if (message.type === "system") {
    return '<div class="fm-msg fm-msg--system"><span>' + escapeHtml(message.text) + '</span></div>';
  }

  const mine = state.user && String(message.sender_id) === String(state.user.id);
  const isAi = message.sender_id === "ai";
  const isSystem = String(message.sender_id) === "system";
  const speaker = isSystem ? "系統" : (isAi ? "小幫手" : (mine ? "我" : (state.room && state.room.peer ? state.room.peer.display_name : "對方")));
  let content;
  if (message.type === "card") {
    content = renderCard(message.card, message.id);
  } else if (message.type === "image") {
    content = '<img class="fm-msg__image" src="' + escapeHtml(resolveImage(message.image_url)) + '" alt="訊息圖片">';
  } else {
    content = '<span>' + escapeHtml(message.text) + '</span>';
  }

  return '<div class="fm-msg ' + (mine ? "fm-msg--me" : "fm-msg--other") + '">' +
    '<div class="fm-msg__meta">' + escapeHtml(speaker) + ' · ' + escapeHtml(timeOf(message.created_at)) + '</div>' +
    '<div class="fm-msg__bubble">' + content + '</div>' +
    '</div>';
}

export function renderMessages() {
  if (!state.messages.length) return "";
  return '<div class="fm-chat">' + state.messages.map(bubble).join("") + '</div>';
}
