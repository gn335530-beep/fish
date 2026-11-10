/* 個人資訊評價區：角色 tabs、預設角色、摘要、卡片、相對時間與載入更多。 */

import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = {};

await import("../assets/js/shared/format.js");
const {
  roleCounts, defaultRole, reviewTabsHTML, reviewSummaryHTML,
  reviewCardHTML, reviewSectionHTML, relativeTime
} = await import("../assets/js/profile/reviews.js");

const RATING = {
  overall: { score: 4.3, count: 7 },
  as_seller: { score: 4.3, count: 6 },
  as_buyer: { score: 4, count: 1 }
};

const REVIEW = {
  id: "rev_1",
  rating: 5,
  tags: ["魚貨新鮮", "準時守約"],
  comment: "魚很新鮮，面交準時。",
  created_at: "2026-11-09T12:00:00.000Z",
  reviewer_id: 2,
  reviewer_name: "小魚買家",
  reviewer_avatar_url: "",
  reviewer_role: "buyer"
};

const NOW = new Date("2026-11-10T12:00:00.000Z");

test("角色數量與預設角色：買家給的評價優先，沒有才切到釣客給的評價", function () {
  assert.deepEqual(roleCounts(RATING), { seller: 6, buyer: 1 });
  assert.equal(defaultRole({ seller: 6, buyer: 1 }), "seller");
  assert.equal(defaultRole({ seller: 0, buyer: 2 }), "buyer");
  assert.equal(defaultRole({ seller: 0, buyer: 0 }), null);
});

test("兩種評價都有才顯示 tabs；只有一種時不顯示", function () {
  const both = reviewTabsHTML("seller", { seller: 6, buyer: 1 });
  assert.match(both, /role="tablist"/);
  assert.match(both, /買家給的評價/);
  assert.match(both, /釣客給的評價/);
  assert.match(both, /data-review-role="seller"/);
  assert.match(both, /aria-selected="true"[^>]*data-review-role="seller"/);

  assert.equal(reviewTabsHTML("seller", { seller: 6, buyer: 0 }), "");
  assert.equal(reviewTabsHTML(null, { seller: 0, buyer: 0 }), "");
});

test("評價摘要顯示平均分、星等與總數", function () {
  const html = reviewSummaryHTML({ score: 4.3, count: 6 });
  assert.match(html, /4\.3/);
  assert.match(html, /6 則/);
  assert.match(html, /fm-stars/);
});

test("評價卡顯示頭像 fallback、名字連結、日期、星等、標籤與評語", function () {
  const html = reviewCardHTML(REVIEW, NOW);
  assert.match(html, /href="profile\.html\?id=2"/);
  assert.match(html, />小<\/span>/);
  assert.match(html, /小魚買家/);
  assert.match(html, /1 天前/);
  assert.match(html, /魚貨新鮮/);
  assert.match(html, /準時守約/);
  assert.match(html, /魚很新鮮/);
  assert.doesNotMatch(html, /09\d{8}|地址/);
});

test("時間顯示：30 天內相對時間，超過顯示 YYYY/MM/DD", function () {
  assert.equal(relativeTime("2026-11-10T11:59:30.000Z", NOW), "剛剛");
  assert.equal(relativeTime("2026-11-10T11:30:00.000Z", NOW), "30 分鐘前");
  assert.equal(relativeTime("2026-11-10T09:00:00.000Z", NOW), "3 小時前");
  assert.equal(relativeTime("2026-11-01T12:00:00.000Z", NOW), "9 天前");
  assert.equal(relativeTime("2026-10-01T12:00:00.000Z", NOW), "2026/10/01");
});

test("評價列表有載入更多、錯誤重試與尚無評價", function () {
  const section = reviewSectionHTML({
    role: "seller",
    counts: { seller: 6, buyer: 1 },
    summary: { score: 4.3, count: 6 },
    reviews: [REVIEW],
    hasMore: true,
    loading: false,
    error: ""
  }, NOW);
  assert.match(section, /data-review-more/);
  assert.match(section, /載入更多/);

  const noMore = reviewSectionHTML({
    role: "seller", counts: { seller: 1, buyer: 0 },
    summary: { score: 5, count: 1 }, reviews: [REVIEW], hasMore: false,
    loading: false, error: ""
  }, NOW);
  assert.doesNotMatch(noMore, /data-review-more/);

  const failed = reviewSectionHTML({
    role: "seller", counts: { seller: 6, buyer: 1 },
    summary: null, reviews: [], hasMore: false, loading: false, error: "載入失敗"
  }, NOW);
  assert.match(failed, /載入失敗/);
  assert.match(failed, /data-review-retry/);

  const empty = reviewSectionHTML({
    role: null, counts: { seller: 0, buyer: 0 },
    summary: null, reviews: [], hasMore: false, loading: false, error: ""
  }, NOW);
  assert.match(empty, /尚無評價/);
});
