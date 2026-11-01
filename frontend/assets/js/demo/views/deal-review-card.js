/* 評價卡：可點星等、四個標籤、評語與送出後的狀態。 */

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

function starsOf(draft, dealId) {
  return [1, 2, 3, 4, 5].map(function (star) {
    const on = Number(draft.rating) >= star;
    return '<button type="button" class="fm-review__star' + (on ? " is-on" : "") +
      '" aria-pressed="' + (Number(draft.rating) === star) + '"' +
      ' data-action="review-star" data-deal="' + dealId + '" data-star="' + star +
      '" aria-label="' + star + ' 星">★</button>';
  }).join("");
}

export function renderReviewCard(card) {
  const user = state.user;
  const status = reviewedStatusOf(card);
  const isBuyer = user && String(card.buyer_id) === String(user.id);
  const mine = isBuyer ? status.buyer_reviewed : status.seller_reviewed;
  const other = isBuyer ? status.seller_reviewed : status.buyer_reviewed;
  const head = '<div class="fm-card fm-card--review">' +
    '<div class="fm-card__deal-head"><b>評價</b></div>';

  if (!user) return head + "</div>";
  if (mine) {
    return head + '<p class="fm-review__note">你已經送出評價。' +
      (other ? "雙方都完成了。" : "等待對方評價。") + "</p></div>";
  }

  const draft = draftOf(card.deal_id);
  const dealId = escapeHtml(card.deal_id);
  const tags = REVIEW_TAGS.map(function (tag, index) {
    return '<label class="fm-review__tag"><input type="checkbox" id="rv-tag-' + dealId + "-" + index +
      '" data-review-tag="' + escapeHtml(tag) + '"' +
      (draft.tags.indexOf(tag) !== -1 ? " checked" : "") +
      "> " + escapeHtml(tag) + "</label>";
  }).join("");

  return head +
    '<div class="fm-review__form" data-review-deal="' + dealId + '">' +
    '<div class="fm-review__rating"><span>整體評分</span>' +
    '<div class="fm-review__stars" role="group" aria-label="整體評分">' +
    starsOf(draft, dealId) + "</div></div>" +
    '<div class="fm-review__tags">' + tags + "</div>" +
    '<textarea id="rv-comment-' + dealId +
    '" data-review-comment maxlength="100" rows="3" placeholder="留下你的評價吧！">' +
    escapeHtml(draft.comment) + "</textarea>" +
    '<button type="button" class="fm-card__primary" data-action="deal-review" data-deal="' +
    dealId + '">確認</button>' +
    "</div></div>";
}
