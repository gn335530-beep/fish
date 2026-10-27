/* 前端讀取共享訂單狀態文案；實際文字與函式只在 shared/deal-status.js。 */

import "../shared/deal-status.js";

export function dealStatusLabel(status, fallback) {
  return window.dealStatusLabel(status, fallback);
}

export function cardStatusLabel(status, fallback) {
  return window.cardStatusLabel(status, fallback);
}

export function dealStatusNote(status) {
  return window.dealStatusNote(status);
}
