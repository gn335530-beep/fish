/* 行情走勢：座標沿用行情卡.svg 的 295×345 畫布。 */

import { priceText } from "./html.js";

const PLOT_LEFT = 11.59;
const PLOT_RIGHT = 280;
const PLOT_TOP = 157.24;
const PLOT_BOTTOM = 200.92;
const CARD_WIDTH = 295;
const CENTER = (PLOT_LEFT + PLOT_RIGHT) / 2;

export function historyFor(card, days) {
  if (days === 30) return card.history_30 || card.history || [];
  return card.history || (card.history_30 || []).slice(-7);
}

export function statsFor(card, days) {
  if (days === 30) return { high: card.high_30, low: card.low_30 };
  return { high: card.high, low: card.low };
}

function xOf(index, count) {
  if (count < 2) return CENTER;
  return PLOT_LEFT + (index / (count - 1)) * (PLOT_RIGHT - PLOT_LEFT);
}

function leftStyle(x) {
  return ' style="left:' + (x / CARD_WIDTH * 100).toFixed(2) + '%"';
}

function valueText(value) {
  return value == null ? "—" : priceText(value);
}

function markIndex(prices, best) {
  let index = 0;
  prices.forEach(function (price, i) {
    if (best === "high" ? price > prices[index] : price < prices[index]) index = i;
  });
  return index;
}

export function chartMarkup(card, days) {
  const history = historyFor(card, days);
  const stats = statsFor(card, days);
  const prices = history.map(function (point) { return Number(point.price_per_taijin); });
  let points = "";
  let highX = CENTER;
  let lowX = CENTER;

  if (prices.length >= 2) {
    const high = Math.max.apply(null, prices);
    const low = Math.min.apply(null, prices);
    const span = high - low;
    points = prices.map(function (price, index) {
      const ratio = span ? (price - low) / span : 0.5;
      const y = PLOT_BOTTOM - ratio * (PLOT_BOTTOM - PLOT_TOP);
      return xOf(index, prices.length).toFixed(2) + "," + y.toFixed(2);
    }).join(" ");
    highX = xOf(markIndex(prices, "high"), prices.length);
    lowX = xOf(markIndex(prices, "low"), prices.length);
  }

  const line = points
    ? '<polyline class="fm-market__line" points="' + points + '" fill="none" stroke-width="2" ' +
      'stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"></polyline>'
    : "";
  const none = points ? "" : '<span class="fm-market__none">暫無走勢</span>';

  return '<svg class="fm-market__chart" viewBox="0 0 295 345" preserveAspectRatio="none" ' +
    'role="img" aria-label="行情走勢">' + line + '</svg>' + none +
    '<span class="fm-market__high"' + leftStyle(Math.min(Math.max(highX, 40), 168)) + '>最高 <b>' +
    valueText(stats.high) + '</b></span>' +
    '<span class="fm-market__low"' + leftStyle(Math.min(Math.max(lowX, 40), 256)) + '>最低 <b>' +
    valueText(stats.low) + '</b></span>';
}
