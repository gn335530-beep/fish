/* 助手房視圖：訊息氣泡、系統訊息、卡片與登入引導。 */

import { state } from "../store.js";
import { escapeHtml, timeOf, resolveImage } from "./html.js";
import { renderCard } from "./cards.js";

function bubble(message) {
  if (message.type === "system") {
    return '<div class="fm-msg fm-msg--system"><span>' + escapeHtml(message.text) + '</span></div>';
  }

  const mine = state.user && String(message.sender_id) === String(state.user.id);
  const isAi = message.sender_id === "ai";
  const speaker = isAi ? "小幫手" : (mine ? "我" : (state.room && state.room.peer ? state.room.peer.display_name : "對方"));
  let content;
  if (message.type === "card") {
    content = renderCard(message.card);
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

export function renderAssistant() {
  if (!state.messages.length) {
    return '<div class="fm-empty">' +
      '<p>可以用對話完成整筆交易。</p>' +
      '<button type="button" class="fm-chip" data-action="hint" data-value="我要賣魚">我要賣魚</button>' +
      '<button type="button" class="fm-chip" data-action="hint" data-value="今天有什麼魚">今天有什麼魚</button>' +
      '</div>';
  }
  return '<div class="fm-chat">' + state.messages.map(bubble).join("") + '</div>';
}

export function renderLogin() {
  const onLoginPage = window.location.pathname.indexOf("login.html") !== -1;
  return '<div class="fm-empty">' +
    '<p>登入後就能用對話買魚、賣魚。</p>' +
    (onLoginPage ? '<p class="fm-empty__note">請先完成登入。</p>' : '<a class="fm-btn" href="login.html">前往登入</a>') +
    '</div>';
}
