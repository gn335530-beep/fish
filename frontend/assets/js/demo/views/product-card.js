/* 助手房詢價推薦小卡：左圖右文，顯示魚種、尾數、價格與洽談購買。 */

import { escapeHtml, money, resolveImage } from "./html.js";
import { normalizeCityName } from "../../shared/regions.js";

function actionOf(card) {
  if (card.status === "DELISTED") {
    return '<span class="fm-card__sold">已下架</span>';
  }
  if (Number(card.available) <= 0) {
    const note = Number(card.reserved_quantity) > 0 ? "洽談中，暫無法購買" : "已售出";
    return '<span class="fm-card__sold">' + note + "</span>";
  }
  return '<button type="button" class="fm-card__buy" data-action="start-deal" data-product="' +
    escapeHtml(card.product_id) + '">洽談購買</button>';
}

export function renderProductCard(card) {
  const species = escapeHtml(card.fish_species || "商品資訊未提供");
  const image = escapeHtml(resolveImage(card.photo_url));
  const condition = escapeHtml(card.condition || "處理方式未提供");
  const region = escapeHtml(normalizeCityName(card.region) || "地區未提供");
  return '<div class="fm-card fm-card--product">' +
    '<div class="fm-card__top">' +
    '<div class="fm-card__media"><img src="' + image + '" alt="' + species + '"></div>' +
    '<div class="fm-card__info">' +
    '<b>' + species + '</b>' +
    '<div class="fm-card__meta">' +
    '<span class="fm-card__qty">共 ' + Number(card.quantity || 0) + ' 尾</span>' +
    '<span class="fm-card__condition">' + condition + '</span>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="fm-card__divider"></div>' +
    '<div class="fm-card__bottom">' +
    '<div class="fm-card__prices">' +
    '<p><span>整批售價：</span><b>' + money(card.price) + '</b></p>' +
    (card.price_per_taijin != null ? '<p><span>每台斤售價：</span><b>' + money(card.price_per_taijin) + '</b></p>' : '') +
    '<p class="fm-card__place">' + region + '</p>' +
    '</div>' +
    '<div class="fm-card__acts">' + actionOf(card) + '</div>' +
    '</div>' +
    '</div>';
}
