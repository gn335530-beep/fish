/* 視圖共用的小工具：跳脫、時間、金額、圖片路徑。 */

export function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function initials(name) {
  return String(name || "魚").trim().slice(0, 1);
}

export function timeOf(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  return String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
}

export function money(value) {
  const number = Number(value) || 0;
  return "NT$" + number.toLocaleString("zh-TW");
}

/* 上傳圖片由後端提供；種子圖片則位於前端 assets。 */
export function resolveImage(url) {
  if (!url) return "../assets/images/catch-still.jpg";
  if (/^(https?:|data:)/.test(url)) return url;
  if (url.indexOf("/uploads/") === 0) return (window.HaisenAPI && window.HaisenAPI.BASE) + url;
  if (url.indexOf("images/") === 0) return "../assets/" + url;
  return url;
}
