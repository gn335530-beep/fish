/* 個人資訊評價區：角色 tabs、預設角色、摘要、卡片、相對時間與載入更多。 */

import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = {};

await import("../assets/js/shared/format.js");
const {
  roleCounts, defaultRole, reviewTabsHTML, reviewSummaryHTML, reviewDistributionHTML,
  reviewSortHTML, reviewSectionHTML
} = await import("../assets/js/profile/reviews.js");
const { reviewCardHTML, relativeTime } = await import("../assets/js/profile/review-card.js");

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

test("分布顯示 5→1，少於 3 則不顯示，點擊長條帶星等", function () {
  assert.equal(reviewDistributionHTML({ count: 2, distribution: { "5": 2 } }, 0), "");

  const html = reviewDistributionHTML({
    count: 5,
    distribution: { "5": 2, "4": 1, "3": 1, "2": 0, "1": 1 }
  }, 5);
  assert.match(html, /data-review-rating="5"/);
  assert.match(html, /data-review-rating="1"/);
  assert.match(html, /data-review-rating="5"[^>]*aria-pressed="true"/);
  assert.match(html, />2</);
  assert.match(html, /aria-label="依星等篩選"/);
});

test("排序選單提供最新、最高與最低，並標出目前選擇", function () {
  const html = reviewSortHTML("highest");
  assert.match(html, /<select[^>]*data-review-sort/);
  assert.match(html, /<option value="newest">最新<\/option>/);
  assert.match(html, /<option value="highest" selected>最高<\/option>/);
  assert.match(html, /<option value="lowest">最低<\/option>/);
});

test("篩選後沒有結果時顯示該星等沒有評價與清除入口", function () {
  const html = reviewSectionHTML({
    role: "seller",
    counts: { seller: 5, buyer: 0 },
    summary: { score: 3.6, count: 5, distribution: { "5": 2, "4": 1, "3": 1, "2": 0, "1": 1 } },
    reviews: [],
    total: 0,
    hasMore: false,
    loading: false,
    error: "",
    sort: "newest",
    rating: 4
  }, NOW);
  assert.match(html, /沒有 4 星的評價/);
  assert.match(html, /data-review-clear-rating/);
});

test("評價卡帶出訂單商品快照，最多 3 張並顯示 +N，缺照片有 placeholder", function () {
  const review = Object.assign({}, REVIEW, {
    products: [
      { title: "石斑（2尾 / 活體）", fish_species: "石斑", photo_url: "/uploads/a.jpg" },
      { title: "黑鯛（2尾 / 活體）", fish_species: "黑鯛", photo_url: "" },
      { title: "花枝（1尾 / 活體）", fish_species: "花枝", photo_url: "/uploads/c.jpg" }
    ],
    product_count: 5
  });
  const html = reviewCardHTML(review, NOW);
  assert.equal((html.match(/profile-review__product"/g) || []).length, 3);
  assert.match(html, /src="\/uploads\/a\.jpg"/);
  assert.match(html, /照片未提供/);
  assert.match(html, /\+2/);
  assert.match(html, /石斑/);
  assert.doesNotMatch(html, /product-detail|lightbox|data-lightbox|<a[^>]*profile-review__product/);

  const empty = reviewCardHTML(Object.assign({}, REVIEW, { products: [], product_count: 0 }), NOW);
  assert.match(empty, /照片未提供/);
});

test("載入中顯示載入訊息，載入更多時按鈕停用", function () {
  const first = reviewSectionHTML({
    role: "seller", counts: { seller: 2, buyer: 0 }, summary: null,
    reviews: [], hasMore: false, loading: true, error: ""
  }, NOW);
  assert.match(first, /載入評價中/);
  assert.doesNotMatch(first, /尚無評價/);

  const more = reviewSectionHTML({
    role: "seller", counts: { seller: 8, buyer: 0 },
    summary: { score: 4.3, count: 8 }, reviews: [REVIEW], hasMore: true,
    loading: true, error: ""
  }, NOW);
  assert.match(more, /data-review-more disabled>載入中…/);
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
