/* 評價星星：半星狀態、唯讀輸出與無障礙名稱。 */

import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = {};

const stars = await import("../assets/js/demo/views/stars.js");

test("星等換算成五顆星的狀態，支援半星", function () {
  assert.deepEqual(stars.starStates(4.5), ["full", "full", "full", "full", "half"]);
  assert.deepEqual(stars.starStates(2), ["full", "full", "empty", "empty", "empty"]);
  assert.deepEqual(stars.starStates(0), ["empty", "empty", "empty", "empty", "empty"]);
  assert.deepEqual(stars.starStates(5), ["full", "full", "full", "full", "full"]);
});

test("超出範圍的分數會夾在 0 到 5 之間", function () {
  assert.deepEqual(stars.starStates(-1), stars.starStates(0));
  assert.deepEqual(stars.starStates(9), stars.starStates(5));
  assert.deepEqual(stars.starStates("3.5"), ["full", "full", "full", "half", "empty"]);
});

test("唯讀星星輸出五個標記並帶無障礙名稱", function () {
  const html = stars.renderStars(3.5, { label: "評價 3.5 分，2 則" });
  assert.match(html, /role="img"/);
  assert.match(html, /aria-label="評價 3\.5 分，2 則"/);
  assert.equal((html.match(/fm-star--full/g) || []).length, 3);
  assert.equal((html.match(/fm-star--half/g) || []).length, 1);
  assert.equal((html.match(/fm-star--empty/g) || []).length, 1);
});

test("沒有指定名稱時使用分數作為預設名稱", function () {
  assert.match(stars.renderStars(4), /aria-label="評價 4 分"/);
  assert.match(stars.renderStars(4.5, { count: 3 }), /aria-label="評價 4\.5 分，3 則"/);
});

test("名稱會跳脫 HTML", function () {
  assert.match(stars.renderStars(1, { label: '<b>"x"</b>' }), /&lt;b&gt;&quot;x&quot;&lt;\/b&gt;/);
});
