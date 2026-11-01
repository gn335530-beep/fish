/* 交易房視圖：訂單摘要與訊息流；對方資訊顯示在面板標題列。 */

import { renderMessages } from "./messages.js";
import { renderDealStrip } from "./deal-strip.js";

export function renderDealRoom() {
  const chat = renderMessages() ||
    '<div class="fm-empty"><p>已開啟交易房，可以直接傳訊息約面交。</p></div>';
  return renderDealStrip() + chat;
}
