/* 個人資訊標題列：角色 chips 排序、空狀態、地區與自己／別人動作。 */

import test from "node:test";
import assert from "node:assert/strict";

import { profileHeaderHTML, ratingChips } from "../assets/js/profile/header.js";

const USER = {
  id: 1,
  display_name: "陳阿海",
  avatar_url: "/uploads/chen.jpg",
  region: "新北市",
  is_verified: true,
  completed_deals: 18,
  rating: {
    overall: { score: 4.8, count: 20 },
    as_seller: { score: 4.9, count: 18 },
    as_buyer: { score: 4.5, count: 2 }
  }
};

test("角色 chips 固定買家給的評價在前、釣客給的評價在後", function () {
  const html = ratingChips(USER.rating);
  const buyerGiven = html.indexOf("買家給的評價");
  const sellerGiven = html.indexOf("釣客給的評價");
  assert.ok(buyerGiven >= 0 && sellerGiven > buyerGiven);
  assert.match(html, /4\.9/);
  assert.match(html, /18 則/);
});

test("只有一種評價時只顯示一個，沒有評價顯示尚無評價", function () {
  const onlyBuyer = ratingChips({
    overall: { score: 5, count: 1 },
    as_seller: { score: 5, count: 1 },
    as_buyer: { score: 0, count: 0 }
  });
  assert.match(onlyBuyer, /買家給的評價/);
  assert.doesNotMatch(onlyBuyer, /釣客給的評價/);

  const none = ratingChips({
    overall: { score: 0, count: 0 },
    as_seller: { score: 0, count: 0 },
    as_buyer: { score: 0, count: 0 }
  });
  assert.match(none, /尚無評價/);
});

test("標題列顯示地區、成交筆數與驗證標章，空地區不顯示", function () {
  const html = profileHeaderHTML(USER, { isSelf: false });
  assert.match(html, /新北市/);
  assert.match(html, /成交 18 筆/);
  assert.match(html, /已驗證/);

  const emptyRegion = profileHeaderHTML(Object.assign({}, USER, { region: "", is_verified: false }), { isSelf: false });
  assert.doesNotMatch(emptyRegion, /地區未提供/);
  assert.doesNotMatch(emptyRegion, /已驗證/);
});

test("自己的頁面連到設定，別人的頁面先不顯示聊聊", function () {
  const own = profileHeaderHTML(USER, { isSelf: true });
  assert.match(own, /href="settings\.html"/);
  assert.match(own, /編輯個人資訊/);

  const other = profileHeaderHTML(USER, { isSelf: false });
  assert.doesNotMatch(other, /聊聊/);
  assert.doesNotMatch(other, /編輯個人資訊/);
});
