/* 協議卡與評價卡。 */

import { state } from "../store.js";
import { escapeHtml, money, dateTimeOf } from "./html.js";
import { cardStatusForDeal, isActionable } from "../deal-state.js";
import { REVIEW_TAGS, draftOf } from "../review-state.js";

const DEAL_STATUS = {
  pending: "等待確認",
  rejected: "已退回",
  confirmed: "已成交",
  cancelled: "已取消",
  expired: "已逾時"
};

const CANCEL_REASONS = [
  ["SELLER_OUT_OF_STOCK", "釣客缺貨"],
  ["BUYER_CHANGED_MIND", "買家改變心意"],
  ["TERMS_MISMATCH", "條件不合"],
  ["OTHER", "其他"]
];

function row(label, value) {
  return "<div><dt>" + escapeHtml(label) + "</dt><dd>" + escapeHtml(value) + "</dd></div>";
}

/* 同一筆訂單可能有好幾張協議卡；只有最後一張跟著目前訂單狀態。 */
function isCurrentCard(card, messageId) {
  const rows = (state.messages || []).filter(function (message) {
    return message.card && message.card.type === card.type &&
      String(message.card.deal_id) === String(card.deal_id);
  });
  if (!rows.length) return true;
  if (messageId == null) return false;
  return String(rows[rows.length - 1].id) === String(messageId);
}

function currentDealFor(card) {
  const deal = state.deal;
  if (!deal || String(deal.id) !== String(card.deal_id)) return null;
  return deal;
}

/* 最新卡片顯示目前訂單狀態；沒有訊息（例如單獨渲染）時沿用卡片本身。 */
function displayStatusOf(card, messageId) {
  const deal = currentDealFor(card);
  if (!deal || !(state.messages || []).length || !isCurrentCard(card, messageId)) {
    return card.status;
  }
  return cardStatusForDeal(deal) || card.status;
}

function dealCardActions(card, messageId) {
  const deal = currentDealFor(card);
  if (!state.room || state.room.type !== "deal" || !deal) return "";
  if (!isCurrentCard(card, messageId) || !isActionable(deal)) return "";
  const status = displayStatusOf(card, messageId);
  if (!(state.messages || []).length && status !== cardStatusForDeal(deal)) return "";
  const mine = state.user && String(card.initiator_id) === String(state.user.id);
  const dealId = escapeHtml(card.deal_id);
  let html = "";

  if (status === "pending" && !mine) {
    html += '<div class="fm-card__acts">' +
      '<button type="button" class="fm-card__primary" data-action="deal-agree" data-deal="' +
      dealId + '">同意</button>' +
      '<button type="button" data-action="deal-reject" data-deal="' + dealId + '">退回</button>' +
      "</div>";
  }

  const selected = (state.cancelReasons || {})[card.deal_id] || "";
  html += '<div class="fm-card__cancel">' +
    '<select data-cancel-reason="' + dealId + '" aria-label="取消原因">' +
    '<option value=""' + (selected ? "" : " selected") + ">選擇原因…</option>" +
    CANCEL_REASONS.map(function (reason) {
      return '<option value="' + reason[0] + '"' +
        (reason[0] === selected ? " selected" : "") + ">" + reason[1] + "</option>";
    }).join("") +
    "</select>" +
    '<button type="button" data-action="deal-cancel" data-deal="' + dealId + '">取消協議</button>' +
    "</div>";
  return html;
}

export function renderDealCard(card, messageId) {
  const items = card.items || [];
  const status = displayStatusOf(card, messageId);
  return '<div class="fm-card fm-card--deal">' +
    '<div class="fm-card__deal-head"><b>協議</b><span class="fm-card__pill">' +
    escapeHtml(DEAL_STATUS[status] || "協議") + '</span></div>' +
    '<ul class="fm-card__deal-items">' + items.map(function (item) {
      return "<li><span>" + escapeHtml(item.title) + " × " + Number(item.quantity || 0) + " 尾</span>" +
        "<span>" + money(Math.round(Number(item.unit_price || 0) * Number(item.quantity || 0))) + "</span></li>";
    }).join("") + "</ul>" +
    '<dl class="fm-card__deal-terms">' +
    row("整單金額", money(card.final_price)) +
    row("面交地點", card.meetup_location) +
    row("面交時間", dateTimeOf(card.meetup_time)) +
    "</dl>" +
    dealCardActions(card, messageId) +
    "</div>";
}

/* 評價狀態以房間最新的訂單摘要為準，讓對方送出的評價不必重開房間就能看到。 */
function reviewedStatusOf(card) {
  const row = ((state.room && state.room.orders) || []).find(function (order) {
    return String(order.id) === String(card.deal_id);
  });
  if (row && row.review_status) return row.review_status;

  const deal = currentDealFor(card);
  if (deal && deal.review_status) return deal.review_status;
  return {
    buyer_reviewed: !!card.buyer_reviewed,
    seller_reviewed: !!card.seller_reviewed
  };
}

export function renderReviewCard(card) {
  const user = state.user;
  const status = reviewedStatusOf(card);
  const isBuyer = user && String(card.buyer_id) === String(user.id);
  const mine = isBuyer ? status.buyer_reviewed : status.seller_reviewed;
  const other = isBuyer ? status.seller_reviewed : status.buyer_reviewed;
  const head = '<div class="fm-card fm-card--review">' +
    '<div class="fm-card__deal-head"><b>評價</b><span class="fm-card__pill">' +
    (mine ? "已評價" : "待評價") + "</span></div>";

  if (!user) return head + "</div>";
  if (mine) {
    return head + '<p class="fm-review__note">你已經送出評價。' +
      (other ? "雙方都完成了。" : "等待對方評價。") + "</p></div>";
  }

  const draft = draftOf(card.deal_id);
  const dealId = escapeHtml(card.deal_id);
  const options = [5, 4, 3, 2, 1].map(function (stars) {
    return '<option value="' + stars + '"' +
      (Number(draft.rating) === stars ? " selected" : "") + ">" + stars + " 星</option>";
  }).join("");
  const tags = REVIEW_TAGS.map(function (tag, index) {
    return '<label class="fm-review__tag"><input type="checkbox" id="rv-tag-' + dealId + "-" + index +
      '" data-review-tag="' + escapeHtml(tag) + '"' +
      (draft.tags.indexOf(tag) !== -1 ? " checked" : "") +
      "> " + escapeHtml(tag) + "</label>";
  }).join("");

  return head +
    '<div class="fm-review__form" data-review-deal="' + dealId + '">' +
    '<label class="fm-review__rating">星等<select id="rv-rating-' + dealId +
    '" data-review-field="rating">' + options + "</select></label>" +
    '<div class="fm-review__tags">' + tags + "</div>" +
    '<textarea id="rv-comment-' + dealId +
    '" data-review-comment maxlength="100" rows="3" placeholder="最多 100 字（選填）">' +
    escapeHtml(draft.comment) + "</textarea>" +
    '<button type="button" class="fm-card__primary" data-action="deal-review" data-deal="' +
    dealId + '">送出評價</button>' +
    "</div></div>";
}
