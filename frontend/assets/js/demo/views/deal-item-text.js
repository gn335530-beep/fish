/* 訂單項目顯示共用：魚種、處理方式、剩餘尾數、價格與總尾數。 */

import { money } from "./html.js";

export function itemSpecies(item) {
  const source = item || {};
  if (source.fish_species) return source.fish_species;
  return String(source.title || "商品").split("（")[0];
}

function itemCondition(item) {
  const source = item || {};
  return source.condition ? String(source.condition) : "";
}

export function totalQuantity(items) {
  return (items || []).reduce(function (sum, item) {
    return sum + Number(item.quantity || 0);
  }, 0);
}

export function itemPriceText(item) {
  const source = item || {};
  if (source.price_per_taijin != null) {
    return money(source.price_per_taijin) + " 元/台斤";
  }
  const batch = source.price != null
    ? source.price
    : Number(source.unit_price || 0) * Number(source.quantity || 0);
  return "整批 " + money(batch);
}

/* 商品條、發送交易與加購共用同一套摘要，避免三處文案各自漂移。 */
export function itemSummary(item) {
  const source = item || {};
  const remaining = Number(source.available || 0);
  const remainingText = "剩 " + remaining + " 尾";
  const priceText = itemPriceText(source);
  return {
    species: itemSpecies(source),
    condition: itemCondition(source),
    remaining: remaining,
    remainingText: remainingText,
    priceText: priceText,
    summaryText: remainingText + " · " + priceText
  };
}
