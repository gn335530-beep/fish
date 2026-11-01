/* 草稿修改與取消上架：文字選欄位、一句話直接改、中途取消與確認卡。 */

import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = { HaisenAPI: { BASE: "http://api.test" } };

const { renderCard } = await import("../assets/js/demo/views/cards.js");
const editing = await import("../assets/js/demo/ai/editing.js");
const listing = await import("../assets/js/demo/ai/listing.js");

function draft(overrides) {
  return Object.assign({
    fish_species: "花枝",
    species_code: 2166,
    weight_kg: 3,
    quantity: 2,
    condition: "放血冰鎮",
    photo_url: "/uploads/a.jpg",
    price: 1000,
    price_per_taijin: 200,
    price_auto: false
  }, overrides || {});
}

function context(overrides) {
  return Object.assign({
    mode: "listing",
    draft: draft(),
    last_cards: [],
    market_quoted: true
  }, overrides || {});
}

test("草稿卡只留三個動作，沒有六個欄位按鈕", function () {
  const html = renderCard({ type: "draft", draft: draft() }, "msg_1");
  assert.match(html, /上架草稿/);
  assert.match(html, /確認上架/);
  assert.match(html, /修改草稿/);
  assert.match(html, /取消上架/);
  assert.doesNotMatch(html, /確認發布/);
  assert.doesNotMatch(html, /重新填寫/);
  assert.doesNotMatch(html, /data-action="edit-slot"/);
  assert.doesNotMatch(html, /fm-card__edits/);
});

test("按修改草稿後用文字問要改哪一項", function () {
  const result = editing.askDraftEdit(context());
  assert.equal(result.context.choosing_edit, true);
  assert.match(result.replies[0].text, /你想修改哪一項/);
  ["魚種", "總重", "尾數", "處理方式", "照片", "售價"].forEach(function (label) {
    assert.match(result.replies[0].text, new RegExp(label));
  });
  assert.equal(result.replies.length, 1);
  assert.ok(!result.replies.some(function (reply) { return reply.card; }));
});

test("認不出欄位時只重問，不重畫草稿卡", function () {
  const result = editing.chooseEditField(context({ choosing_edit: true }), "不知道");
  assert.match(result.replies[0].text, /你想修改哪一項/);
  assert.equal(result.replies.length, 1);
  assert.ok(!result.replies.some(function (reply) { return reply.card; }));
});

test("只說欄位時先問新值", function () {
  const result = editing.chooseEditField(context(), "重量");
  assert.equal(result.context.editing.slot, "weight_kg");
  assert.equal(result.context.choosing_edit, null);
  assert.match(result.replies[0].text, /新的總重/);
});

test("一句話含欄位與新值就直接改", function () {
  const result = editing.chooseEditField(context(), "重量改成 10 公斤");
  assert.equal(result.context.editing, null);
  assert.equal(result.context.draft.weight_kg, 10);
  assert.equal(result.context.market_quoted, false);
  assert.match(result.replies[0].text, /已更新總重/);
});

test("處理方式可以一句話改", function () {
  const result = editing.chooseEditField(context(), "處理方式改成活體");
  assert.equal(result.context.draft.condition, "活體");
  assert.match(result.replies[0].text, /已更新處理方式/);
  assert.ok(result.replies.some(function (reply) {
    return reply.card && reply.card.type === "draft";
  }));
});

test("魚種可以一句話改並清掉舊代碼", function () {
  const result = editing.chooseEditField(context(), "魚種改成鮪魚");
  assert.equal(result.context.draft.fish_species, "鮪魚");
  assert.equal(result.context.draft.species_code, null);
  assert.equal(result.context.market_quoted, false);
});

test("售價可以一句話改並重算自動整批", function () {
  const result = editing.chooseEditField(
    context({ draft: draft({ price_auto: true, price: 1000 }) }),
    "售價改成每台斤 250"
  );
  assert.equal(result.context.draft.price_per_taijin, 250);
  assert.equal(result.context.draft.price_auto, true);
  assert.equal(result.context.draft.price, 1250);
});

test("一句話講多個欄位只套用第一個", function () {
  const result = editing.chooseEditField(context(), "重量改成 10 公斤、尾數改成 3 尾");
  assert.equal(result.context.draft.weight_kg, 10);
  assert.equal(result.context.draft.quantity, 2);
});

test("修改草稿中途取消回到修改前草稿", function () {
  const started = editing.beginEdit(context(), "weight_kg");
  const result = editing.editText(started.context, "取消");
  assert.equal(result.context.editing, null);
  assert.equal(result.context.draft.weight_kg, 3);
  assert.match(result.replies[0].text, /已取消修改/);
  assert.equal(result.replies.length, 1);
});

test("選欄位階段取消只回文字，不重畫草稿卡", function () {
  const result = editing.chooseEditField(context({ choosing_edit: true }), "取消");
  assert.equal(result.context.choosing_edit, null);
  assert.match(result.replies[0].text, /已取消修改/);
  assert.equal(result.replies.length, 1);
});

test("取消上架先問確認，可返回繼續上架", function () {
  const asked = listing.requestCancel(context());
  assert.match(asked.replies[0].text, /確定取消上架/);
  assert.match(asked.replies[0].text, /開啟新的 AI 對話/);
  assert.ok(asked.replies.some(function (reply) {
    return reply.card && reply.card.type === "draft_cancel";
  }));

  const dismissed = listing.dismissCancel(context());
  assert.match(dismissed.replies[0].text, /繼續上架/);
  assert.equal(dismissed.replies.length, 1);
  assert.ok(!dismissed.replies.some(function (reply) { return reply.card; }));
});
