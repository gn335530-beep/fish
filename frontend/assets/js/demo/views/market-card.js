/* 行情卡：平均價、走勢、重量試算與單位切換。 */

import { escapeHtml, priceText } from "./html.js";
import { marketScope } from "./market.js";
import { chartMarkup } from "./market-chart.js";
import { state } from "../store.js";
import {
  weightOf, unitOf, setMarketWeight, setMarketUnit, referenceText
} from "../market-state.js";

const SOURCE_TEXT = "資料來源：農業部 漁業署";

/* 價格字級 48px；在 295px 卡片上，右緣要留給「元/台斤」。
   以下為 48px Noto Sans 的近似字寬與可用寬度，集中放在一處避免魔數散落。 */
const PRICE_GEOMETRY = Object.freeze({
  digit: 26.7,
  dot: 8.4,
  availableWidth: 89,
  minHorizontalScale: .5,
  verticalScale: .9
});

function priceScale(text) {
  let width = 0;
  String(text).split("").forEach(function (ch) {
    width += ch === "." ? PRICE_GEOMETRY.dot : PRICE_GEOMETRY.digit;
  });
  return width > PRICE_GEOMETRY.availableWidth
    ? Math.max(PRICE_GEOMETRY.minHorizontalScale, PRICE_GEOMETRY.availableWidth / width)
    : 1;
}

function dayButton(messageId, days, active) {
  return '<button type="button" data-action="market-days" data-days="' + days +
    '" data-message="' + escapeHtml(messageId || "") + '" aria-pressed="' + (active ? "true" : "false") + '">' +
    days + '日</button>';
}

function unitButton(messageId, value, label, checked) {
  const id = escapeHtml(messageId || "");
  return '<label class="fm-market__unit-btn">' +
    '<input type="radio" name="market-unit-' + id + '" value="' + value +
    '" data-market-unit="' + id + '"' + (checked ? " checked" : "") + '>' +
    '<span>' + label + '</span></label>';
}

export function renderMarketCard(card, messageId) {
  const days = Number((state.marketDays || {})[messageId]) === 30 ? 30 : 7;
  const unit = unitOf(messageId);
  const id = escapeHtml(messageId || "");
  const price = priceText(card.price_per_taijin);
  const scope = marketScope(card);
  return '<div class="fm-card fm-card--market" data-price-per-taijin="' +
    escapeHtml(card.price_per_taijin) + '">' +
    '<b class="fm-market__head">行情卡</b>' +
    '<b class="fm-market__species">' + escapeHtml(card.species_name || "魚種未提供") + '</b>' +
    '<b class="fm-market__price" style="--price-scale:' + priceScale(price) +
    ';--price-scale-y:' + PRICE_GEOMETRY.verticalScale + '">' + price + '</b>' +
    '<span class="fm-market__price-unit">元/台斤</span>' +
    '<p class="fm-market__meta">' + (scope ? "(" + escapeHtml(scope) + ")" : "") + '</p>' +
    '<div class="fm-market__days">' + dayButton(messageId, 7, days === 7) + dayButton(messageId, 30, days === 30) + '</div>' +
    chartMarkup(card, days) +
    '<span class="fm-market__date">' + escapeHtml(card.trade_date || "") + '</span>' +
    '<span class="fm-market__label">近' + days + '個交易日</span>' +
    '<span class="fm-market__weight-label">重量</span>' +
    '<input class="fm-market__weight" type="number" min="0" step="0.1" inputmode="decimal" data-market-weight="' +
    id + '" value="' + escapeHtml(weightOf(messageId)) + '" aria-label="重量">' +
    '<div class="fm-market__units" role="group" aria-label="重量單位">' +
    unitButton(messageId, "taijin", "台斤", unit === "taijin") +
    unitButton(messageId, "kg", "公斤", unit === "kg") +
    '</div>' +
    '<span class="fm-market__ref-label">參考價格</span>' +
    '<b class="fm-market__ref" data-market-ref="' + id + '">' + escapeHtml(referenceText(card, messageId)) + '</b>' +
    '<small class="fm-market__ref-note">（依重量計算整批價格）</small>' +
    '<span class="fm-market__source">' + SOURCE_TEXT + '</span>' +
    '</div>';
}

function refreshReference(card, messageId) {
  if (!card) return;
  const ref = card.querySelector("[data-market-ref]");
  if (!ref) return;
  ref.textContent = referenceText({
    price_per_taijin: Number(card.getAttribute("data-price-per-taijin"))
  }, messageId);
}

export function handleMarketWeightInput(input) {
  const messageId = input.getAttribute("data-market-weight");
  setMarketWeight(messageId, input.value);
  refreshReference(input.closest(".fm-card--market"), messageId);
}

/* 單位控制沿用 change 契約：radio 提供 value 與 data-market-unit。 */
export function handleMarketUnitChange(control) {
  const messageId = control.getAttribute("data-market-unit");
  const card = control.closest(".fm-card--market");
  const input = card && card.querySelector("[data-market-weight]");
  /* 以輸入框目前的值為準；切換單位只重算參考價格，不改重量數字。 */
  if (input) setMarketWeight(messageId, input.value);
  setMarketUnit(messageId, control.value);
  refreshReference(card, messageId);
}
