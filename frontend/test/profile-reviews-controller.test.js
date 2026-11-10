/* 個人資訊評價控制器：每個角色 tab 各自保留排序與星等篩選，變更時 offset 重設。 */

import test from "node:test";
import assert from "node:assert/strict";

const calls = [];

function review(id, rating) {
  return {
    id: id, rating: rating, tags: [], comment: "",
    created_at: "2026-11-10T10:00:00.000Z", reviewer_id: 2,
    reviewer_name: "小魚", reviewer_avatar_url: "", reviewer_role: "buyer",
    products: [], product_count: 0
  };
}

function summary(score, count, distribution) {
  return { score: score, count: count, distribution: distribution };
}

globalThis.window = {
  HaisenAPI: {
    request: async function (path) {
      const params = new URLSearchParams(path.split("?")[1]);
      const row = {
        role: params.get("role"),
        sort: params.get("sort"),
        rating: params.get("rating"),
        offset: Number(params.get("offset")),
        limit: Number(params.get("limit"))
      };
      calls.push(row);

      if (row.role === "buyer") {
        return { data: {
          summary: summary(5, 1, { "5": 1, "4": 0, "3": 0, "2": 0, "1": 0 }),
          total: 1, reviews: [review("rev_buyer", 5)], has_more: false
        } };
      }
      if (row.offset > 0) {
        return { data: {
          summary: summary(4.3, 8, { "5": 5, "4": 2, "3": 1, "2": 0, "1": 0 }),
          total: 8, reviews: [review("rev_7", 4), review("rev_8", 4)], has_more: false
        } };
      }
      return { data: {
        summary: summary(4.3, 8, { "5": 5, "4": 2, "3": 1, "2": 0, "1": 0 }),
        total: 8,
        reviews: [review("rev_1", 5), review("rev_2", 5), review("rev_3", 5),
          review("rev_4", 5), review("rev_5", 5), review("rev_6", 4)],
        has_more: true
      } };
    }
  }
};

const { createReviewsController } = await import("../assets/js/profile/reviews-controller.js");

function click(selector, dataset) {
  return { target: { closest: function (candidate) {
    return candidate === selector ? { dataset: dataset || {} } : null;
  } } };
}

function change(selector, value) {
  return { target: { closest: function (candidate) {
    return candidate === selector ? { value: value } : null;
  } } };
}

test("切換 tab、排序與星等篩選都各自保留，變更時 offset 重設", async function () {
  calls.length = 0;
  const section = { hidden: true, innerHTML: "" };
  const controller = createReviewsController({
    section: section,
    profile: {
      id: 1,
      rating: {
        as_seller: { score: 4.3, count: 8 },
        as_buyer: { score: 5, count: 1 }
      }
    },
    pageSize: 6
  });

  await controller.start();
  assert.deepEqual(calls[0], { role: "seller", sort: "newest", rating: null, offset: 0, limit: 6 });

  await controller.handleClick(click("[data-review-more]"));
  assert.equal(calls[1].offset, 6);
  assert.equal(calls[1].sort, "newest");

  await controller.handleChange(change("[data-review-sort]", "highest"));
  assert.equal(calls[2].offset, 0);
  assert.equal(calls[2].sort, "highest");

  await controller.handleClick(click("[data-review-rating]", { reviewRating: "5" }));
  assert.equal(calls[3].offset, 0);
  assert.equal(calls[3].rating, "5");
  assert.equal(calls[3].sort, "highest");

  await controller.handleClick(click("[data-review-role]", { reviewRole: "buyer" }));
  assert.equal(calls[4].role, "buyer");
  assert.equal(calls[4].sort, "newest");
  assert.equal(calls[4].rating, null);

  const before = calls.length;
  await controller.handleClick(click("[data-review-role]", { reviewRole: "seller" }));
  assert.equal(calls.length, before);
  assert.match(section.innerHTML, /<option value="highest" selected>最高<\/option>/);
  assert.match(section.innerHTML, /data-review-rating="5"[^>]*aria-pressed="true"/);
});

test("重新建立控制器時回到最新與無星等篩選", async function () {
  calls.length = 0;
  const section = { hidden: true, innerHTML: "" };
  const controller = createReviewsController({
    section: section,
    profile: {
      id: 1,
      rating: {
        as_seller: { score: 4.3, count: 8 },
        as_buyer: { score: 5, count: 1 }
      }
    },
    pageSize: 6
  });

  await controller.start();
  assert.deepEqual(calls[0], { role: "seller", sort: "newest", rating: null, offset: 0, limit: 6 });
});
