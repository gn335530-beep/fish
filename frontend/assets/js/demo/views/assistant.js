/* 助手房視圖：訊息流與登入引導。 */

import { state } from "../store.js";
import { renderMessages } from "./messages.js";
import { NO_ASSISTANT_TEXT } from "./html.js";

export function renderAssistant() {
  if (!state.room || state.room.type !== "assistant") {
    return '<div class="fm-empty">' +
      '<p>' + NO_ASSISTANT_TEXT + '</p>' +
      '<button type="button" class="fm-chip" data-action="new-assistant">新增 AI 對話</button>' +
      '</div>';
  }
  if (!state.messages.length) {
    return '<div class="fm-empty">' +
      '<p>可以用對話完成整筆交易。</p>' +
      '<button type="button" class="fm-chip" data-action="hint" data-value="我要賣魚">我要賣魚</button>' +
      '<button type="button" class="fm-chip" data-action="hint" data-value="今天有什麼魚">今天有什麼魚</button>' +
      '</div>';
  }
  return renderMessages();
}

export function renderLogin() {
  const onLoginPage = window.location.pathname.indexOf("login.html") !== -1;
  return '<div class="fm-empty">' +
    '<p>登入後就能用對話買魚、賣魚。</p>' +
    (onLoginPage ? '<p class="fm-empty__note">請先完成登入。</p>' : '<a class="fm-btn" href="login.html">前往登入</a>') +
    '</div>';
}
