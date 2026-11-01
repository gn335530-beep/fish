/* 助手房詢價推薦小卡：左圖右文，顯示魚種、尾數、價格與洽談購買。 */

import { escapeHtml, money, resolveImage } from "./html.js";
import { normalizeCityName } from "../../shared/regions.js";

function actionOf(card) {
  if (Number(card.available) <= 0) {
    const note = Number(card.reserved_quantity) > 0 ? "洽談中，暫無法購買" : "已售出";
    return '<span class="fm-card__sold">' + note + "</span>";
  }
  return '<button type="button" class="fm-card__primary" data-action="start-deal" data-product="' +
    escapeHtml(card.product_id) + '">洽談購買</button>';
}

export function renderProductCard(card) {
  const species = escapeHtml(card.fish_species || "商品資訊未提供");
  const image = escapeHtml(resolveImage(card.photo_url));
  const condition = escapeHtml(card.condition || "處理方式未提供");
  const region = escapeHtml(normalizeCityName(card.region) || "地區未提供");
  return '<div class="fm-card fm-card--product">' +
    '<img src="' + image + '" alt="' + species + '">' +
    '<div class="fm-card__body">' +
    '<b>' + species + '</b>' +
    '<span>' + condition + '</span>' +
    '<span>共 ' + Number(card.quantity || 0) + ' 尾</span>' +
    (card.price_per_taijin != null ? '<span>每台斤售價：' + money(card.price_per_taijin) + '</span>' : '') +
    '<span>整批售價：' + money(card.price) + '</span>' +
    '<span>' + region + '</span>' +
    '<div class="fm-card__acts">' + actionOf(card) + '</div>' +
    '</div>' +
    '</div>';
}
