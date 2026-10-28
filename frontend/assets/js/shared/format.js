/* 前端格式單一來源：跳脫、金額、日期時間、台斤換算與行情文字；classic 頁面與 ESM 共用。 */

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
  });
}

function money(value) {
  return "NT$" + (Number(value) || 0).toLocaleString("zh-TW");
}

function parseDate(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  return isNaN(date.getTime()) ? null : date;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function timeOf(iso) {
  const date = parseDate(iso);
  if (!date) return "";
  return pad2(date.getHours()) + ":" + pad2(date.getMinutes());
}

function dateTimeOf(iso) {
  const date = parseDate(iso);
  if (!date) return "";
  return pad2(date.getMonth() + 1) + "/" + pad2(date.getDate()) + " " + timeOf(iso);
}

function dateOf(iso) {
  const date = parseDate(iso);
  if (!date) return "";
  return date.getFullYear() + "/" + pad2(date.getMonth() + 1) + "/" + pad2(date.getDate());
}

/* datetime-local 需要本地時間且不含秒。 */
function localInputOf(iso) {
  const date = parseDate(iso);
  if (!date) return "";
  return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate()) +
    "T" + pad2(date.getHours()) + ":" + pad2(date.getMinutes());
}

const KG_PER_TAIJIN = 0.6;

function kgFromTaijin(value) {
  return Number(value) * KG_PER_TAIJIN;
}

function taijinFromKg(value) {
  return Number(value) / KG_PER_TAIJIN;
}

function hasMarketPrice(data) {
  return !!(data && data.price_per_taijin != null);
}

/* 行情數字固定一位小數，整數不顯示 .0。 */
function priceText(value) {
  return Number(value).toFixed(1).replace(/\.0$/, "");
}

function marketPriceText(data) {
  if (!hasMarketPrice(data)) return "暫無行情";
  return priceText(data.price_per_taijin) + " 元／台斤";
}

function marketScopeText(data) {
  if (!hasMarketPrice(data)) return "";
  return data.scope === "city" ? (data.region || "縣市") + "平均" : "全國平均";
}

window.HaisenFormat = {
  escapeHtml: escapeHtml,
  money: money,
  timeOf: timeOf,
  dateTimeOf: dateTimeOf,
  dateOf: dateOf,
  localInputOf: localInputOf,
  KG_PER_TAIJIN: KG_PER_TAIJIN,
  kgFromTaijin: kgFromTaijin,
  taijinFromKg: taijinFromKg,
  priceText: priceText,
  marketPriceText: marketPriceText,
  marketScopeText: marketScopeText
};
