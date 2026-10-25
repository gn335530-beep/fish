/* 訊息卡片：商品卡與上架草稿卡。 */

import { escapeHtml, money, resolveImage, dateTimeOf } from "./html.js";
import { normalizeCityName } from "../ai/species.js";
import { DRAFT_FIELDS } from "../ai/editing.js";

const DEAL_STATUS = {
  pending: "等待確認",
  rejected: "已退回",
  confirmed: "已成交",
  cancelled: "已取消",
  expired: "已逾時"
};

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

function productCard(card) {
  const title = escapeHtml(card.title || "商品");
  const image = escapeHtml(resolveImage(card.photo_url));
  const available = Number(card.available) || 0;
  const reserved = Number(card.reserved_quantity) || 0;
  const stock = available > 0 ? "可售 " + available + " 尾" : (reserved > 0 ? "洽談中" : "已售出");
  return '<div class="fm-card fm-card--product">' +
    '<img src="' + image + '" alt="' + title + '">' +
    '<div class="fm-card__body">' +
    '<b>' + title + '</b>' +
    '<span>' + money(card.price) + '　每尾約 ' + money(card.unit_price) + '</span>' +
    '<span>' + escapeHtml(card.weight_kg) + ' kg · ' + escapeHtml(card.quantity) + ' 尾 · ' + escapeHtml(card.condition) + '</span>' +
    '<span>' + escapeHtml(normalizeCityName(card.region)) + '　' + stock + '</span>' +
    '</div>' +
    dealActions(card) +
    '</div>';
}

function row(label, value) {
  return '<div><dt>' + escapeHtml(label) + '</dt><dd>' + escapeHtml(value) + '</dd></div>';
}

function draftCard(card) {
  const draft = card.draft || {};
  const edits = DRAFT_FIELDS.map(function (field) {
    return '<button type="button" data-action="edit-slot" data-slot="' + field.slot + '">' + field.label + '</button>';
  }).join("");
  return '<div class="fm-card fm-card--draft">' +
    '<b>商品草稿</b>' +
    '<dl>' +
    row("魚種", draft.fish_species) +
    row("總重", draft.weight_kg + " kg") +
    row("尾數", draft.quantity + " 尾") +
    row("處理", draft.condition) +
    row("售價", money(draft.price)) +
    '</dl>' +
    '<div class="fm-card__edits"><span>修改</span>' + edits + '</div>' +
    (draft.photo_url ? '<img class="fm-card__thumb" src="' + escapeHtml(resolveImage(draft.photo_url)) + '" alt="商品照片">' : "") +
    '<div class="fm-card__acts">' +
    '<button type="button" class="fm-card__primary" data-action="publish">確認發布</button>' +
    '<button type="button" data-action="reset-draft">重新填寫</button>' +
    '</div>' +
    '</div>';
}

function dealCard(card) {
  const items = card.items || [];
  return '<div class="fm-card fm-card--deal">' +
    '<div class="fm-card__deal-head"><b>協議</b><span class="fm-card__pill">' +
    escapeHtml(DEAL_STATUS[card.status] || "協議") + '</span></div>' +
    '<ul class="fm-card__deal-items">' + items.map(function (item) {
      return "<li><span>" + escapeHtml(item.title) + " × " + Number(item.quantity || 0) + " 尾</span>" +
        "<span>" + money(Math.round(Number(item.unit_price || 0) * Number(item.quantity || 0))) + "</span></li>";
    }).join("") + "</ul>" +
    '<dl class="fm-card__deal-terms">' +
    row("整單金額", money(card.final_price)) +
    row("面交地點", card.meetup_location) +
    row("面交時間", dateTimeOf(card.meetup_time)) +
    "</dl></div>";
}

export function renderCard(card) {
  if (!card) return "";
  if (card.type === "product") return productCard(card);
  if (card.type === "draft") return draftCard(card);
  if (card.type === "deal") return dealCard(card);
  return '<div class="fm-card fm-card--plain">' + escapeHtml(card.title || "訊息卡片") + '</div>';
}
