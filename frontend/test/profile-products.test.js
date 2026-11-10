/* 個人資訊商品區：自己／別人、空狀態、管理商品切換與卡片選項。 */

import test from "node:test";
import assert from "node:assert/strict";

import { productSectionHTML } from "../assets/js/profile/products.js";

const ROWS = [
  { id: "prd_a", status: "ACTIVE" },
  { id: "prd_b", status: "DELISTED" },
  { id: "prd_c", status: "SOLD_OUT" }
];

function fakeCard(product, options) {
  return '<article data-id="' + product.id + '" data-own="' + options.own +
    '" data-manage="' + options.manage + '" data-hide-seller="' + options.hideSeller + '"></article>';
}

function options(overrides) {
  return Object.assign({ renderCard: fakeCard }, overrides || {});
}

test("自己的商品區顯示數量、管理商品與全部商品", function () {
  const html = productSectionHTML(ROWS, options({ isSelf: true }));
  assert.match(html, /3 件/);
  assert.match(html, /data-profile-manage/);
  assert.match(html, /管理商品/);
  assert.doesNotMatch(html, /完成/);
  assert.equal((html.match(/data-own="true"/g) || []).length, 3);
  assert.equal((html.match(/data-manage="false"/g) || []).length, 3);
  assert.equal((html.match(/data-hide-seller="true"/g) || []).length, 3);
  assert.doesNotMatch(html, /上架紀錄/);
});

test("按下管理商品後按鈕變完成，卡片進入管理模式", function () {
  const html = productSectionHTML(ROWS, options({ isSelf: true, managing: true }));
  assert.match(html, />完成</);
  assert.doesNotMatch(html, /管理商品/);
  assert.equal((html.match(/data-manage="true"/g) || []).length, 3);
});

test("別人的商品區沒有管理商品，卡片仍隱藏釣客資訊", function () {
  const html = productSectionHTML(ROWS, options({ isSelf: false }));
  assert.doesNotMatch(html, /data-profile-manage|管理商品|完成/);
  assert.equal((html.match(/data-own="false"/g) || []).length, 3);
  assert.equal((html.match(/data-hide-seller="true"/g) || []).length, 3);
});

test("自己與別人的空狀態不同", function () {
  assert.match(productSectionHTML([], options({ isSelf: true })), /你還沒有上架商品/);
  assert.match(productSectionHTML([], options({ isSelf: false })), /目前沒有上架商品/);
});
