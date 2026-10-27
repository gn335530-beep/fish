/* 交易房的訂單摘要：項目明細、加購、改量與刪除。 */

import { state } from "../store.js";
import { escapeHtml, money } from "./html.js";
import { canResend, isDraft, isFinished } from "../deal-state.js";
import { dealStatusLabel } from "../deal-labels.js";
import { preferredOrder, orderSummaryText, summaryOfDeal } from "../room-order.js";
import { proposalForm, termsBlock, statusNote } from "./deal-terms.js";

function isBuyer() {
  const deal = state.deal;
  return !!(deal && state.user && String(deal.buyer_id) === String(state.user.id));
}

function canEdit() {
  return isBuyer() && isDraft(state.deal);
}

function quantityOptions(max, selected) {
  let html = "";
  for (let i = 1; i <= max; i++) {
    html += '<option value="' + i + '"' +
      (String(i) === String(selected) ? " selected" : "") + ">" + i + " 尾</option>";
  }
  return html;
}

function itemRow(item) {
  const quantity = Number(item.quantity || 0);
  const available = Number(item.available || 0);
  const subtotal = Math.round(Number(item.unit_price || 0) * quantity);
  const draft = isDraft(state.deal);
  const hint = (draft ? "可售 " + available + " 尾 · " : "") + "每尾 " + money(item.unit_price);
  let actions;

  if (canEdit()) {
    actions = '<div class="fm-order__qty">' +
      '<button type="button" data-action="qty-down" data-item="' + escapeHtml(item.item_id) +
      '" data-qty="' + quantity + '"' + (quantity <= 1 ? " disabled" : "") + ">−</button>" +
      '<b>' + quantity + "</b>" +
      '<button type="button" data-action="qty-up" data-item="' + escapeHtml(item.item_id) +
      '" data-qty="' + quantity + '"' + (quantity >= available ? " disabled" : "") + ">＋</button>" +
      '<button type="button" class="fm-order__remove" data-action="remove-item" data-item="' +
      escapeHtml(item.item_id) + '">刪除</button>' +
      "</div>";
  } else {
    actions = '<span class="fm-order__plain">' + quantity + " 尾</span>";
  }

  return '<li class="fm-order__item">' +
    '<div class="fm-order__name"><b>' + escapeHtml(item.title) + "</b>" +
    "<span>" + escapeHtml(hint) + "</span></div>" +
    '<div class="fm-order__side"><span>' + money(subtotal) + "</span>" + actions + "</div>" +
    "</li>";
}

function addonRow(product) {
  const available = Number(product.available) || 0;
  return '<div class="fm-order__addon">' +
    '<div class="fm-order__name"><b>' + escapeHtml(product.title) + "</b>" +
    "<span>可售 " + available + " 尾 · 每尾 " + money(product.unit_price) + "</span></div>" +
    '<div class="fm-order__side">' +
    '<select data-addon-qty="' + escapeHtml(product.id) + '" aria-label="加購尾數">' +
    quantityOptions(available, (state.addonQty || {})[product.id]) + "</select>" +
    '<button type="button" data-action="add-item" data-product="' + escapeHtml(product.id) + '">加入</button>' +
    "</div></div>";
}

function addonsBlock() {
  const rows = state.addons || [];
  return '<div class="fm-order__addons">' +
    '<div class="fm-order__addons-head"><b>加購這位釣客的商品</b>' +
    "<span>只列出尚未加入且可售的商品</span></div>" +
    (rows.length ? rows.map(addonRow).join("") : '<p class="fm-order__empty">目前沒有其他可售商品。</p>') +
    "</div>";
}

function mayResend(deal) {
  return canResend(deal, state.user && state.user.id);
}

/* 已結束或尚未載入明細時，只顯示摘要，不提供任何操作。 */
function summaryPanel(order) {
  if (!order) return '<div class="fm-order fm-order--plain"><span>尚無訂單</span></div>';
  return '<div class="fm-order fm-order--plain"><b>' +
    escapeHtml(orderSummaryText(order)) + "</b></div>";
}

/* 房間摘要若指向別筆訂單，已載入的這筆仍以自己的摘要顯示。 */
function summaryFor(deal) {
  const roomOrder = preferredOrder(state.room);
  if (roomOrder && String(roomOrder.id) === String(deal.id)) return roomOrder;
  return summaryOfDeal(deal);
}

function bodyOf(deal, items) {
  const draft = isDraft(deal);
  let html = items.length
    ? '<ul class="fm-order__items">' + items.map(itemRow).join("") + "</ul>"
    : '<p class="fm-order__empty">尚未加入商品。</p>';

  if (canEdit()) {
    html += '<div class="fm-order__acts">' +
      '<button type="button" data-action="toggle-addon">＋ 加購</button>' +
      (items.length ? '<button type="button" data-action="clear-items">清空訂單</button>' : "") +
      "</div>";
    if (state.addonOpen) html += addonsBlock();
  }

  if (draft) {
    if (state.proposeOpen) {
      html += proposalForm();
    } else {
      html += '<div class="fm-order__acts"><button type="button" class="fm-order__primary"' +
        ' data-action="toggle-propose"' + (items.length ? "" : " disabled") + ">協商完畢</button></div>";
    }
  } else if (deal.deal_terms) {
    html += termsBlock(deal);
    if (mayResend(deal)) {
      html += state.proposeOpen
        ? proposalForm()
        : '<div class="fm-order__acts"><button type="button" class="fm-order__primary"' +
          ' data-action="toggle-propose">修改條件並重送</button></div>';
    }
  }

  const note = statusNote(deal);
  if (note) html += '<p class="fm-order__note">' + escapeHtml(note) + "</p>";
  return html;
}

export function renderDealOrder() {
  const deal = state.deal;
  if (!deal) return summaryPanel(preferredOrder(state.room));
  if (isFinished(deal)) return summaryPanel(summaryFor(deal));

  const items = deal.items || [];
  const tails = items.reduce(function (sum, item) {
    return sum + Number(item.quantity || 0);
  }, 0);
  const open = state.dealOpen;

  return '<div class="fm-order">' +
    '<button type="button" class="fm-order__head" data-action="toggle-order" aria-expanded="' +
    String(open) + '">' +
    '<span class="fm-order__status">' + escapeHtml(dealStatusLabel(deal.deal_status)) + "</span>" +
    "<b>" + items.length + " 項 · " + tails + " 尾 · " + money(deal.items_total) + "</b>" +
    "<em>" + (open ? "收合" : "明細") + "</em></button>" +
    (open ? bodyOf(deal, items) : "") +
    "</div>";
}
