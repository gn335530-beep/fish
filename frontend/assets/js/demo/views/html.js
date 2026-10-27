/* 視圖共用的小工具：格式函式來自 shared/format.js，這裡只保留頭像與圖片路徑。 */

import "../../shared/format.js";

export const escapeHtml = window.HaisenFormat.escapeHtml;
export const money = window.HaisenFormat.money;
export const priceText = window.HaisenFormat.priceText;
export const timeOf = window.HaisenFormat.timeOf;
export const dateTimeOf = window.HaisenFormat.dateTimeOf;
export const localInputOf = window.HaisenFormat.localInputOf;

export function initials(name) {
  return String(name || "魚").trim().slice(0, 1);
}

export const NO_ASSISTANT_TEXT = "目前沒有 AI 對話。按「新增 AI 對話」開始。";

/* 上傳圖片由後端提供；種子圖片則位於前端 assets。 */
export function resolveImage(url) {
  if (!url) return "../assets/images/catch-still.jpg";
  if (/^(https?:|data:)/.test(url)) return url;
  if (url.indexOf("/uploads/") === 0) return (window.HaisenAPI && window.HaisenAPI.BASE) + url;
  if (url.indexOf("images/") === 0) return "../assets/" + url;
  return url;
}
