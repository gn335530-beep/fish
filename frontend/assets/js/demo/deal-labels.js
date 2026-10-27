/* 前端讀取共享訂單狀態文案；實際文字與規則只在 shared/deal-status.js。 */

import "../shared/deal-status.js";

const shared = window.DealStatus;

export const dealStatusLabel = shared.dealStatusLabel;
export const cardStatusLabel = shared.cardStatusLabel;
export const dealStatusNote = shared.dealStatusNote;
