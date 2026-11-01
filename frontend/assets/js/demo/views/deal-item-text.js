/* 訂單項目顯示共用：魚種、價格與總尾數。 */

import { money } from "./html.js";

export function itemSpecies(item) {
  const source = item || {};
  if (source.fish_species) return source.fish_species;
  return String(source.title || "商品").split("（")[0];
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
