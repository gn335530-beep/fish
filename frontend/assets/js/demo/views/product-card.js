/* 商品卡：圖片、價格、庫存與洽談購買操作。 */

import { escapeHtml, money, resolveImage } from "./html.js";
import { normalizeCityName } from "../../shared/regions.js";

function dealActions(card) {
  const available = Number(card.available) || 0;
  const reserved = Number(card.reserved_quantity) || 0;
  const ask = '<button type="button" data-action="ask-product" data-product="' +
    escapeHtml(card.product_id) + '">深入諮詢</button>';
  if (available <= 0) {
    const note = reserved > 0 ? "洽談中，暫無法購買" : "已售出";
    return '<div class="fm-card__acts">' + ask + '<span class="fm-card__sold">' + note + "</span></div>";
  }

  const options = [];
  for (let i = 1; i <= available; i++) {
    options.push('<option value="' + i + '">' + i + ' 尾</option>');
  }
  return '<div class="fm-card__acts">' +
    ask +
    '<select class="fm-card__qty" data-fm-qty="' + escapeHtml(card.product_id) + '" aria-label="購買尾數">' +
    options.join("") + '</select>' +
    '<button type="button" class="fm-card__primary" data-action="start-deal" data-product="' +
    escapeHtml(card.product_id) + '">洽談購買</button>' +
    '</div>';
}

export function renderProductCard(card) {
  const title = escapeHtml(card.title || "商品資訊未提供");
  const image = escapeHtml(resolveImage(card.photo_url));
  const available = Number(card.available) || 0;
  const reserved = Number(card.reserved_quantity) || 0;
  const stock = available > 0 ? "可售 " + available + " 尾" : (reserved > 0 ? "洽談中" : "已售出");
  return '<div class="fm-card fm-card--product">' +
    '<img src="' + image + '" alt="' + title + '">' +
    '<div class="fm-card__body">' +
    '<b>' + title + '</b>' +
    '<span>整批 ' + money(card.price) + (card.price_auto ? '（自動計算）' : '') + '</span>' +
    (card.price_per_taijin != null ? '<span>每台斤 ' + money(card.price_per_taijin) + '</span>' : '') +
    '<span>每尾均價 ' + money(card.unit_price) + '</span>' +
    '<span>' + escapeHtml(card.weight_kg) + ' kg · ' + escapeHtml(card.quantity) + ' 尾 · ' + escapeHtml(card.condition) + '</span>' +
    '<span>' + escapeHtml(normalizeCityName(card.region)) + '　' + stock + '</span>' +
    '</div>' +
    dealActions(card) +
    '</div>';
}
