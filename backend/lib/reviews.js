/* 評價：送出一方評價後重算對方的星等、評價數與未到次數。 */

const { all, findById, patch } = require("./store");
const { cardMessage } = require("./orders");

const REVIEW_TAGS = ["準時守約", "魚貨新鮮", "溝通良好", "包裝完善", "臨時放鳥"];
const NO_SHOW_TAG = "臨時放鳥";

function reviewsFor(userId) {
  return all("reviews").filter(function (review) {
    return String(review.target_user_id) === String(userId);
  });
}

/* 用全部評價重算星等與評價數；未到次數只累加，不因重算而減少。 */
function recomputeUser(userId, addNoShow) {
  const rows = reviewsFor(userId);
  const count = rows.length;
  const total = rows.reduce(function (sum, review) { return sum + Number(review.rating || 0); }, 0);
  const score = count ? Math.round((total / count) * 10) / 10 : 0;
  const user = findById("users", userId);
  const noShow = Number(user && user.no_show_count || 0) + (addNoShow ? 1 : 0);

  return patch("users", userId, {
    rating_score: score,
    review_count: count,
    no_show_count: noShow,
    is_blacklisted: noShow >= 3
  });
}

function reviewStatusOf(deal) {
  const status = deal.review_status || {};
  return {
    buyer_reviewed: !!status.buyer_reviewed,
    seller_reviewed: !!status.seller_reviewed
  };
}

function reviewCardMessage(deal) {
  const status = reviewStatusOf(deal);
  return cardMessage(deal.conversation_id, "system", {
    type: "review",
    deal_id: deal.id,
    buyer_id: deal.buyer_id,
    seller_id: deal.seller_id,
    buyer_reviewed: status.buyer_reviewed,
    seller_reviewed: status.seller_reviewed
  });
}

/* 只更新最新的評價卡，較早的卡留作歷史。 */
function syncReviewCard(dealId, status) {
  const cards = all("messages").filter(function (message) {
    return message.card && message.card.type === "review"
      && String(message.card.deal_id) === String(dealId);
  });
  cards.sort(function (a, b) { return Number(b.seq) - Number(a.seq); });
  if (!cards.length) return;
  patch("messages", cards[0].id, {
    card: Object.assign({}, cards[0].card, {
      buyer_reviewed: !!status.buyer_reviewed,
      seller_reviewed: !!status.seller_reviewed
    })
  });
}

module.exports = {
  REVIEW_TAGS: REVIEW_TAGS,
  NO_SHOW_TAG: NO_SHOW_TAG,
  reviewsFor: reviewsFor,
  recomputeUser: recomputeUser,
  reviewStatusOf: reviewStatusOf,
  reviewCardMessage: reviewCardMessage,
  syncReviewCard: syncReviewCard
};
