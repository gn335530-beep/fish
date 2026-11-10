/* 交易房標題列：對方名稱、評價星星與電話。 */

import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = {};

const { dealRoomHeader, peerForHeader } = await import("../assets/js/demo/views/deal-room-header.js");

test("標題列顯示對方名稱、半星評價與電話，名字連到個人資訊", function () {
  const header = dealRoomHeader({
    id: 1,
    display_name: "陳阿海",
    rating_score: 4.5,
    review_count: 2,
    username: "0912345678"
  });
  assert.equal(header.title, "陳阿海");
  assert.match(header.titleHtml, /href="profile\.html\?id=1"/);
  assert.match(header.titleHtml, /陳阿海/);
  assert.match(header.sub, /aria-label="評價 4\.5 分，2 則"/);
  assert.match(header.sub, /fm-star--half/);
  assert.match(header.aside, /href="tel:0912345678"/);
  assert.match(header.aside, /撥打電話/);
  assert.match(header.aside, /0912345678/);
  assert.doesNotMatch(header.sub, /button|data-action/);
});

test("沒有評價時顯示空心星與尚無評價", function () {
  const header = dealRoomHeader({
    display_name: "陳阿海",
    rating_score: 0,
    review_count: 0,
    username: "0912345678"
  });
  assert.match(header.sub, /尚無評價/);
  assert.match(header.sub, /aria-label="評價 0 分，0 則"/);
  assert.equal((header.sub.match(/fm-star--empty/g) || []).length, 5);
});

test("評價數為 0 時即使有舊分數也顯示空心星", function () {
  const header = dealRoomHeader({
    display_name: "陳阿海",
    rating_score: 4.9,
    review_count: 0,
    username: "0912345678"
  });
  assert.match(header.sub, /尚無評價/);
  assert.equal((header.sub.match(/fm-star--empty/g) || []).length, 5);
});

test("沒有電話時顯示電話未提供且不可點", function () {
  const header = dealRoomHeader({ display_name: "陳阿海", rating_score: 4, review_count: 1, username: "" });
  assert.match(header.aside, /電話未提供/);
  assert.doesNotMatch(header.aside, /href="tel:/);
});

test("有訂單時使用訂單的對方角色評價，純聊天房才用整體評價", function () {
  const overall = { id: 1, display_name: "陳阿海", rating_score: 4.9, review_count: 10 };
  const rolePeer = { id: 1, display_name: "陳阿海", rating_score: 0, review_count: 0 };

  const dealHeader = dealRoomHeader(peerForHeader({ peer: rolePeer }, { peer: overall }));
  assert.equal(dealHeader.title, "陳阿海");
  assert.match(dealHeader.sub, /尚無評價/);
  assert.doesNotMatch(dealHeader.sub, /4\.9/);

  const chatHeader = dealRoomHeader(peerForHeader(null, { peer: overall }));
  assert.match(chatHeader.sub, /aria-label="評價 4\.9 分，10 則"/);
});
