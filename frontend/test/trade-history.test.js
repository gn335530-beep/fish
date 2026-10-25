/* 交易紀錄抽屜的 HTML：列表、空狀態與單筆詳情。 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(
  new URL("../assets/js/app/10-trade-history.js", import.meta.url), "utf8"
);

function newContext() {
  const ctx = vm.createContext({
    window: { HaisenAPI: { photoUrl: function (path) { return path; } } },
    document: { querySelectorAll: function () { return []; } },
    getUser: function () { return { id: 2 }; }
  });
  vm.runInContext(source, ctx);
  return ctx;
}

function listHTML(ctx, rows) {
  vm.runInContext("tradeHistory = " + JSON.stringify({ loading: false, error: "", rows: rows }), ctx);
  return vm.runInContext("tradeHistoryHTML()", ctx);
}

function detailHTML(ctx, payload) {
  vm.runInContext("tradeDetail = " + JSON.stringify(payload), ctx);
  return vm.runInContext("tradeDetailHTML()", ctx);
}

const CONFIRMED = {
  id: "deal_1",
  deal_status: "CONFIRMED",
  created_at: "2026-10-25T02:00:00.000Z",
  confirmed_at: "2026-10-25T03:00:00.000Z",
  item_count: 2,
  total_quantity: 3,
  final_price: 4330,
  my_reviewed: true,
  peer_reviewed: true,
  peer: { id: 1, display_name: "陳阿海" }
};

test("沒有訂單時顯示空狀態", function () {
  const html = listHTML(newContext(), []);
  assert.match(html, /目前沒有交易紀錄。/);
});

test("列表顯示狀態、對方、品項數、金額與評價狀態", function () {
  const html = listHTML(newContext(), [CONFIRMED]);
  assert.match(html, /已成交/);
  assert.match(html, /陳阿海/);
  assert.match(html, /2 項 · 3 尾 · NT\$4,330/);
  assert.match(html, /雙方已評價/);
  assert.match(html, /data-deal-open="deal_1"/);
});

test("未成交的訂單評價欄位顯示 —", function () {
  const pending = Object.assign({}, CONFIRMED, {
    deal_status: "PENDING_REVIEW",
    confirmed_at: null,
    my_reviewed: false,
    peer_reviewed: false
  });
  const html = listHTML(newContext(), [pending]);
  assert.match(html, /等待確認/);
  assert.match(html, /評價：—/);
});

test("單筆詳情顯示多品項快照與面交資訊", function () {
  const html = detailHTML(newContext(), {
    id: "deal_1",
    loading: false,
    error: "",
    deal: Object.assign({}, CONFIRMED, {
      items: [
        { title: "石斑（4.5kg / 1尾 / 放血冰鎮）", quantity: 1, unit_price: 2800, photo_url: "/uploads/a.jpg" },
        { title: "嘉鱲（2.2kg / 2尾 / 三去處理）", quantity: 2, unit_price: 765, photo_url: "/uploads/b.jpg" }
      ],
      deal_terms: {
        final_price: 4330,
        meetup_location: "基隆火車站南站",
        meetup_time: "2026-10-26T09:30:00.000Z"
      }
    })
  });
  assert.match(html, /石斑（4.5kg \/ 1尾 \/ 放血冰鎮）/);
  assert.match(html, /2 尾 × NT\$765/);
  assert.match(html, /NT\$4,330/);
  assert.match(html, /基隆火車站南站/);
  assert.match(html, /10\/26/);
  assert.match(html, /你已評價/);
});

test("載入失敗時提供重試", function () {
  const ctx = newContext();
  const html = listHTML(ctx, []);
  vm.runInContext("tradeHistory = { loading: false, error: '載入失敗', rows: [] }", ctx);
  const failed = vm.runInContext("tradeHistoryHTML()", ctx);
  assert.match(html, /目前沒有交易紀錄/);
  assert.match(failed, /載入失敗/);
  assert.match(failed, /data-history-retry/);
});
