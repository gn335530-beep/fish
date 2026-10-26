/* 上架行情卡：平均價、7／30 交易日走勢、期間高低與參考整批金額。 */

import { escapeHtml, money } from "./html.js";
import { state } from "../store.js";

function priceText(value) {
  return Number(value).toFixed(1).replace(/\.0$/, "");
}

function scopeText(card) {
  return card.scope === "city" ? (card.region || "縣市") + "平均" : "全國平均";
}

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

export function renderMarketCard(card, messageId) {
  const days = Number((state.marketDays || {})[messageId]) === 30 ? 30 : 7;
  const history = historyFor(card, days);
  const stats = statsFor(card, days);
  const weightTaijin = card.weight_taijin == null ? null : priceText(card.weight_taijin) + " 台斤";
  return '<div class="fm-card fm-card--market">' +
    '<div class="fm-market__head"><b>' + escapeHtml(card.species_name || "行情") + '行情</b>' +
    '<span class="fm-market__ref">新鮮批發參考</span></div>' +
    '<div class="fm-market__price"><b>' + priceText(card.price_per_taijin) + '</b> <span>元／台斤</span></div>' +
    '<div class="fm-market__meta">' + escapeHtml(scopeText(card)) + ' · ' +
    escapeHtml(card.trade_date || "") + ' · ' + escapeHtml(card.source || "") + '</div>' +
    (card.is_aquaculture ? '<span class="fm-market__tag">養殖價格</span>' : "") +
    '<div class="fm-market__days">' + dayButton(messageId, 7, days === 7) + dayButton(messageId, 30, days === 30) + '</div>' +
    '<div class="fm-market__label">近 ' + days + ' 個交易日</div>' +
    chartSvg(history) +
    '<div class="fm-market__range">' +
    '<span>最高 ' + escapeHtml(stats.high == null ? "—" : priceText(stats.high)) + '</span>' +
    '<span>最低 ' + escapeHtml(stats.low == null ? "—" : priceText(stats.low)) + '</span>' +
    '</div>' +
    '<dl class="fm-market__calc">' +
    '<div><dt>重量</dt><dd>' + escapeHtml(card.weight_kg) + ' kg' +
    (weightTaijin ? '（' + escapeHtml(weightTaijin) + '）' : "") + '</dd></div>' +
    '<div><dt>參考整批</dt><dd>' + money(card.estimated_total) + '</dd></div>' +
    '</dl>' +
    '<div class="fm-market__note">新鮮批發參考，非售價或保證收購價。</div>' +
    '</div>';
}
