/* 行情卡：平均價、走勢、重量試算與單位切換。 */

import { escapeHtml, priceText } from "./html.js";
import { marketScope } from "./market.js";
import { state } from "../store.js";
import {
  weightOf, unitOf, setMarketWeight, setMarketUnit, referenceText
} from "../market-state.js";

const SOURCE_TEXT = "資料來源：農業部 漁業署";

function historyFor(card, days) {
  if (days === 30) return card.history_30 || card.history || [];
  return card.history || (card.history_30 || []).slice(-7);
}

function statsFor(card, days) {
  if (days === 30) return { high: card.high_30, low: card.low_30 };
  return { high: card.high, low: card.low };
}

function chartSvg(history) {
  const prices = history.map(function (point) { return Number(point.price_per_taijin); });
  if (prices.length < 2) return '<p class="fm-market__none">暫無走勢</p>';
  const high = Math.max.apply(null, prices);
  const low = Math.min.apply(null, prices);
  const span = high - low || 1;
  const points = prices.map(function (price, index) {
    const x = (index / (prices.length - 1)) * 100;
    const y = 30 - ((price - low) / span) * 28;
    return x.toFixed(1) + "," + y.toFixed(1);
  }).join(" ");
  return '<svg class="fm-market__chart" viewBox="0 0 100 32" preserveAspectRatio="none" role="img" aria-label="行情走勢">' +
    '<polyline points="' + points + '" fill="none" stroke="currentColor" stroke-width="1.6" vector-effect="non-scaling-stroke"></polyline>' +
    '</svg>';
}

function dayButton(messageId, days, active) {
  return '<button type="button" data-action="market-days" data-days="' + days +
    '" data-message="' + escapeHtml(messageId || "") + '" aria-pressed="' + (active ? "true" : "false") + '">' +
    days + ' 日</button>';
}

function calcBlock(card, messageId) {
  const unit = unitOf(messageId);
  const id = escapeHtml(messageId || "");
  return '<div class="fm-market__calc">' +
    '<label class="fm-market__weight"><span>重量</span>' +
    '<input type="number" min="0" step="0.1" inputmode="decimal" data-market-weight="' +
    id + '" value="' + escapeHtml(weightOf(messageId)) + '" aria-label="重量">' +
    '</label>' +
    '<select class="fm-market__unit" data-market-unit="' + id + '" aria-label="重量單位">' +
    '<option value="taijin"' + (unit === "taijin" ? " selected" : "") + '>台斤</option>' +
    '<option value="kg"' + (unit === "kg" ? " selected" : "") + '>公斤</option>' +
    '</select>' +
    '<div class="fm-market__ref"><span>參考價格</span>' +
    '<b data-market-ref="' + id + '">' + escapeHtml(referenceText(card, messageId)) + '</b>' +
    '<small>（依重量計算整批價格）</small></div>' +
    '</div>';
}

export function renderMarketCard(card, messageId) {
  const days = Number((state.marketDays || {})[messageId]) === 30 ? 30 : 7;
  const history = historyFor(card, days);
  const stats = statsFor(card, days);
  return '<div class="fm-card fm-card--market" data-price-per-taijin="' +
    escapeHtml(card.price_per_taijin) + '">' +
    '<div class="fm-market__head"><b>行情卡</b></div>' +
    '<div class="fm-market__species">' + escapeHtml(card.species_name || "魚種未提供") + '</div>' +
    '<div class="fm-market__price"><b>' + priceText(card.price_per_taijin) + '</b> <span>元／台斤</span></div>' +
    '<div class="fm-market__meta">' + escapeHtml(marketScope(card)) + ' · ' +
    escapeHtml(card.trade_date || "") + '</div>' +
    '<div class="fm-market__days">' + dayButton(messageId, 7, days === 7) + dayButton(messageId, 30, days === 30) + '</div>' +
    '<div class="fm-market__label">近 ' + days + ' 交易日</div>' +
    chartSvg(history) +
    '<div class="fm-market__range">' +
    '<span>最高 ' + escapeHtml(stats.high == null ? "—" : priceText(stats.high)) + '</span>' +
    '<span>最低 ' + escapeHtml(stats.low == null ? "—" : priceText(stats.low)) + '</span>' +
    '</div>' +
    calcBlock(card, messageId) +
    '<div class="fm-market__source">' + SOURCE_TEXT + '</div>' +
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

export function handleMarketUnitChange(select) {
  const messageId = select.getAttribute("data-market-unit");
  const value = setMarketUnit(messageId, select.value);
  const card = select.closest(".fm-card--market");
  const input = card && card.querySelector("[data-market-weight]");
  if (input) input.value = value;
  refreshReference(card, messageId);
}
