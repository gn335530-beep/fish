/* 訊息卡片：商品卡與上架草稿卡。 */

import { escapeHtml, money, resolveImage } from "./html.js";
import { normalizeCityName } from "../ai/species.js";

function productCard(card) {
  const title = escapeHtml(card.title || "商品");
  const image = escapeHtml(resolveImage(card.photo_url));
  const stock = Number(card.available) > 0 ? "可售 " + card.available + " 尾" : "已售出";
  return '<div class="fm-card fm-card--product">' +
    '<img src="' + image + '" alt="' + title + '">' +
    '<div class="fm-card__body">' +
    '<b>' + title + '</b>' +
    '<span>' + money(card.price) + '　每尾約 ' + money(card.unit_price) + '</span>' +
    '<span>' + escapeHtml(card.weight_kg) + ' kg · ' + escapeHtml(card.quantity) + ' 尾 · ' + escapeHtml(card.condition) + '</span>' +
    '<span>' + escapeHtml(normalizeCityName(card.region)) + '　' + stock + '</span>' +
    '</div>' +
    '<div class="fm-card__acts">' +
    '<button type="button" data-action="ask-product" data-product="' + escapeHtml(card.product_id) + '">深入諮詢</button>' +
    '</div>' +
    '</div>';
}

function row(label, value) {
  return '<div><dt>' + escapeHtml(label) + '</dt><dd>' + escapeHtml(value) + '</dd></div>';
}

function draftCard(card) {
  const draft = card.draft || {};
  return '<div class="fm-card fm-card--draft">' +
    '<b>商品草稿</b>' +
    '<dl>' +
    row("魚種", draft.fish_species) +
    row("總重", draft.weight_kg + " kg") +
    row("尾數", draft.quantity + " 尾") +
    row("處理", draft.condition) +
    row("售價", money(draft.price)) +
    '</dl>' +
    (draft.photo_url ? '<img class="fm-card__thumb" src="' + escapeHtml(resolveImage(draft.photo_url)) + '" alt="商品照片">' : "") +
    '<div class="fm-card__acts">' +
    '<button type="button" class="fm-card__primary" data-action="publish">確認發布</button>' +
    '<button type="button" data-action="reset-draft">重新填寫</button>' +
    '</div>' +
    '</div>';
}

export function renderCard(card) {
  if (!card) return "";
  if (card.type === "product") return productCard(card);
  if (card.type === "draft") return draftCard(card);
  return '<div class="fm-card fm-card--plain">' + escapeHtml(card.title || "訊息卡片") + '</div>';
}
