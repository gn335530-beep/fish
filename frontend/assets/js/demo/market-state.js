/* 行情卡重量試算：每個訊息各自保存重量與單位，純前端計算。 */

import { state } from "./store.js";
import "../shared/format.js";

const format = window.HaisenFormat;

function keyOf(messageId) {
  return String(messageId == null ? "" : messageId);
}

function entries() {
  return { weights: state.marketWeights, units: state.marketUnits };
}

export function weightOf(messageId) {
  return entries().weights[keyOf(messageId)] || "";
}

export function unitOf(messageId) {
  return entries().units[keyOf(messageId)] === "kg" ? "kg" : "taijin";
}

export function setMarketWeight(messageId, value) {
  entries().weights[keyOf(messageId)] = String(value == null ? "" : value);
}

/* 換成台斤；空白、非數字或非正數都視為沒有重量。 */
export function taijinOf(value, unit) {
  const number = Number(value);
  if (!(number > 0)) return 0;
  return unit === "kg" ? number / format.KG_PER_TAIJIN : number;
}

/* 切換單位只改變重量數字的解讀方式；重量數字本身不換算。 */
export function setMarketUnit(messageId, unit) {
  entries().units[keyOf(messageId)] = unit === "kg" ? "kg" : "taijin";
}

export function referencePrice(card, messageId) {
  const taijin = taijinOf(weightOf(messageId), unitOf(messageId));
  const price = Number(card && card.price_per_taijin);
  if (!(taijin > 0) || !(price > 0)) return null;
  return Math.round(price * taijin);
}

export function referenceText(card, messageId) {
  const price = referencePrice(card, messageId);
  return price == null ? "—" : format.money(price);
}
