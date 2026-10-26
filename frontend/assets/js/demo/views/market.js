/* 對話商品卡使用的行情文字；一般商品頁由 05-product-view.js 產生相同格式。 */

export function hasMarket(snapshot) {
  return !!(snapshot && snapshot.price_per_taijin != null);
}

export function marketPrice(snapshot) {
  if (!hasMarket(snapshot)) return "暫無行情";
  return Number(snapshot.price_per_taijin).toFixed(1).replace(/\.0$/, "") + " 元／台斤";
}

export function marketScope(snapshot) {
  if (!hasMarket(snapshot)) return "";
  return snapshot.scope === "city" ? (snapshot.region || "縣市") + "平均" : "全國平均";
}

export function marketLine(snapshot) {
  if (!hasMarket(snapshot)) return "新鮮批發參考 · 暫無行情";
  return [
    "新鮮批發參考",
    marketPrice(snapshot),
    marketScope(snapshot),
    snapshot.trade_date,
    snapshot.source,
    snapshot.is_aquaculture ? "養殖價格" : ""
  ].filter(Boolean).join(" · ");
}
