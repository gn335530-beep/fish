/* 評價：成交後雙方互評，並提供公開的評價列表。 */

const express = require("express");
const { all, findById, insert, patch, nextCode } = require("../lib/store");
const { requireUser, publicUser } = require("../lib/auth");
const {
  REVIEW_TAGS, NO_SHOW_TAG, reviewsFor, recomputeUser, reviewStatusOf, syncReviewCard
} = require("../lib/reviews");
const deals = require("../lib/deals");
const { ok, created, fail } = require("../lib/http");

const router = express.Router();

function parseReview(body) {
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { code: "INVALID_RATING", message: "星等必須是 1 到 5" };
  }
  if (body.tags !== undefined && !Array.isArray(body.tags)) {
    return { code: "INVALID_TAGS", message: "標籤必須是陣列" };
  }
  if ((body.tags || []).length > 3) {
    return { code: "TOO_MANY_TAGS", message: "最多選 3 個標籤" };
  }
  const tags = Array.from(new Set(body.tags || []));
  if (tags.some(function (tag) { return REVIEW_TAGS.indexOf(tag) === -1; })) {
    return { code: "INVALID_TAGS", message: "含有未知的評價標籤" };
  }
  const comment = String(body.comment || "").trim();
  if (comment.length > 100) {
    return { code: "COMMENT_TOO_LONG", message: "評語不可超過 100 字" };
  }
  return { rating: rating, tags: tags, comment: comment };
}

router.post("/api/reviews/submit", requireUser, function (req, res) {
  const deal = deals.requireDeal(req, res);
  if (!deal) return;
  if (deal.deal_status !== "CONFIRMED") {
    fail(res, 409, "DEAL_NOT_CONFIRMED", "只有成交的訂單可以評價");
    return;
  }

  const duplicate = all("reviews").find(function (review) {
    return String(review.deal_id) === String(deal.id)
      && String(review.reviewer_id) === String(req.user.id);
  });
  if (duplicate) {
    fail(res, 409, "ALREADY_REVIEWED", "這筆訂單你已經評價過了");
    return;
  }

  const parsed = parseReview(req.body || {});
  if (parsed.code) {
    fail(res, 400, parsed.code, parsed.message);
    return;
  }

  const isBuyer = deals.isBuyer(deal, req.user.id);
  const role = isBuyer ? "buyer" : "seller";
  const targetId = isBuyer ? deal.seller_id : deal.buyer_id;
  const now = new Date().toISOString();
  const review = insert("reviews", {
    id: nextCode("reviews", "rev"),
    deal_id: deal.id,
    reviewer_id: Number(req.user.id),
    target_user_id: Number(targetId),
    reviewer_role: role,
    rating: parsed.rating,
    tags: parsed.tags,
    comment: parsed.comment,
    created_at: now
  });

  const status = reviewStatusOf(deal);
  status[role + "_reviewed"] = true;
  patch("deals", deal.id, { review_status: status, updated_at: now });
  syncReviewCard(deal.id, status);

  const target = recomputeUser(targetId, parsed.tags.indexOf(NO_SHOW_TAG) !== -1);
  created(res, { review: review, target: publicUser(target) }, "評價已送出");
});

router.get("/api/reviews", function (req, res) {
  const user = findById("users", Number(req.query.user_id));
  if (!user) {
    fail(res, 404, "USER_NOT_FOUND", "找不到這個使用者");
    return;
  }

  const rows = reviewsFor(user.id);
  const count = rows.length;
  const total = rows.reduce(function (sum, review) { return sum + Number(review.rating || 0); }, 0);
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const reviews = rows
    .sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); })
    .slice(0, limit)
    .map(function (review) {
      const reviewer = publicUser(findById("users", review.reviewer_id));
      return {
        id: review.id,
        rating: Number(review.rating || 0),
        tags: review.tags || [],
        comment: review.comment || "",
        created_at: review.created_at,
        reviewer_name: (reviewer && reviewer.display_name) || "會員"
      };
    });

  ok(res, {
    user_id: user.id,
    rating_score: count ? Math.round((total / count) * 10) / 10 : 0,
    review_count: count,
    reviews: reviews
  }, "取得評價成功");
});

module.exports = router;
