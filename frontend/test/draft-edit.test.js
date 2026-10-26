/* 草稿修改與取消上架：按鈕、欄位選擇、中途取消與確認卡。 */

import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = { HaisenAPI: { BASE: "http://api.test" } };

const { renderCard } = await import("../assets/js/demo/views/cards.js");
const editing = await import("../assets/js/demo/ai/editing.js");
const listing = await import("../assets/js/demo/ai/listing.js");

function draft() {
  return {
    fish_species: "花枝",
    species_id: "cuttlefish",
    weight_kg: 3,
    quantity: 2,
    condition: "放血冰鎮",
    photo_url: "/uploads/a.jpg",
    price: 1000,
    price_per_taijin: 200,
    price_auto: false
  };
}

function context() {
  return { mode: "listing", draft: draft(), last_cards: [], market_quoted: true };
}

test("草稿卡有修改草稿與取消上架，沒有重新填寫", function () {
  const html = renderCard({ type: "draft", draft: draft() }, "msg_1");
  assert.match(html, /確認發布/);
  assert.match(html, /修改草稿/);
  assert.match(html, /取消上架/);
  assert.doesNotMatch(html, /重新填寫/);
  assert.equal((html.match(/data-action="edit-slot"/g) || []).length, 6);
});

test("按修改草稿後問要修改哪個選項並保留六個欄位", function () {
  const result = editing.askDraftEdit(context());
  assert.equal(result.context.choosing_edit, true);
  assert.match(result.replies[0].text, /請問要修改哪個選項？/);
  assert.ok(result.replies.some(function (reply) {
    return reply.card && reply.card.type === "draft";
  }));
});

test("可以用打字指定要修改的欄位", function () {
  const result = editing.chooseEditField(
    Object.assign(context(), { choosing_edit: true }),
    "重量"
  );
  assert.equal(result.context.editing.slot, "weight_kg");
  assert.equal(result.context.choosing_edit, null);
  assert.match(result.replies[0].text, /新的總重/);
});

test("修改草稿中途取消回到修改前草稿", function () {
  const started = editing.beginEdit(context(), "weight_kg");
  const result = editing.editText(started.context, "取消");
  assert.equal(result.context.editing, null);
  assert.equal(result.context.draft.weight_kg, 3);
  assert.match(result.replies[0].text, /已取消修改/);
});

test("取消上架先問確認，可返回繼續上架", function () {
  const asked = listing.requestCancel(context());
  assert.match(asked.replies[0].text, /確定取消上架？此對話會一併刪除/);
  assert.ok(asked.replies.some(function (reply) {
    return reply.card && reply.card.type === "draft_cancel";
  }));

  const dismissed = listing.dismissCancel(context());
  assert.match(dismissed.replies[0].text, /繼續上架/);
  assert.ok(dismissed.replies.some(function (reply) {
    return reply.card && reply.card.type === "draft";
  }));
});
