/* 評價卡：星等、標籤、評語與送出後的狀態。 */

import { state } from "../store.js";
import { escapeHtml } from "./html.js";
import { REVIEW_TAGS, draftOf } from "../review-state.js";
import { currentDealFor } from "./deal-card-state.js";

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
