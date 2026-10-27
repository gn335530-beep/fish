/* 前端格式單一來源：跳脫、金額、日期時間與行情快照；classic 頁面與 ESM 共用這個全域。 */

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

function hasMarketSnapshot(snapshot) {
  return !!(snapshot && snapshot.price_per_taijin != null);
}

/* 行情數字固定一位小數，整數不顯示 .0。 */
function priceText(value) {
  return Number(value).toFixed(1).replace(/\.0$/, "");
}

function marketSnapshotPrice(snapshot) {
  if (!hasMarketSnapshot(snapshot)) return "暫無行情";
  return priceText(snapshot.price_per_taijin) + " 元／台斤";
}

function marketSnapshotScope(snapshot) {
  if (!hasMarketSnapshot(snapshot)) return "";
  return snapshot.scope === "city" ? (snapshot.region || "縣市") + "平均" : "全國平均";
}

function marketSnapshotSource(snapshot) {
  const parts = ["新鮮批發參考"];
  if (hasMarketSnapshot(snapshot) && snapshot.source) parts.unshift(snapshot.source);
  if (hasMarketSnapshot(snapshot) && snapshot.is_aquaculture) parts.push("養殖價格");
  return parts.join(" · ");
}

/* 商品卡用的「地區 · 日期 · 來源」摘要，不含價格。 */
function marketSnapshotMeta(snapshot) {
  return [
    marketSnapshotScope(snapshot),
    snapshot.trade_date,
    marketSnapshotSource(snapshot)
  ].filter(Boolean).join(" · ");
}

function marketSnapshotLine(snapshot) {
  if (!hasMarketSnapshot(snapshot)) return "新鮮批發參考 · 暫無行情";
  return [
    "新鮮批發參考",
    marketSnapshotPrice(snapshot),
    marketSnapshotScope(snapshot),
    snapshot.trade_date,
    snapshot.source,
    snapshot.is_aquaculture ? "養殖價格" : ""
  ].filter(Boolean).join(" · ");
}

window.HaisenFormat = {
  escapeHtml: escapeHtml,
  money: money,
  timeOf: timeOf,
  dateTimeOf: dateTimeOf,
  dateOf: dateOf,
  localInputOf: localInputOf,
  hasMarketSnapshot: hasMarketSnapshot,
  priceText: priceText,
  marketSnapshotPrice: marketSnapshotPrice,
  marketSnapshotScope: marketSnapshotScope,
  marketSnapshotSource: marketSnapshotSource,
  marketSnapshotMeta: marketSnapshotMeta,
  marketSnapshotLine: marketSnapshotLine
};
