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
    quantity: 2,
    condition: "放血冰鎮",
    photo_url: "/uploads/a.jpg",
    price: 1000,
    price_per_taijin: 200
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

test("草稿卡只留三個動作，沒有總重與自動計算", function () {
  const html = renderCard({ type: "draft", draft: draft({ price_auto: true }) }, "msg_1");
  assert.match(html, /上架草稿/);
  assert.match(html, /確認上架/);
  assert.match(html, /修改草稿/);
  assert.match(html, /取消上架/);
  assert.doesNotMatch(html, /確認發布/);
  assert.doesNotMatch(html, /重新填寫/);
  assert.doesNotMatch(html, /總重|kg/);
  assert.doesNotMatch(html, /自動計算/);
  assert.doesNotMatch(html, /data-action="edit-slot"/);
  assert.doesNotMatch(html, /fm-card__edits/);
});

test("按修改草稿後用文字問要改哪一項", function () {
  const result = editing.askDraftEdit(context());
  assert.equal(result.context.choosing_edit, true);
  assert.match(result.replies[0].text, /你想修改哪一項/);
  ["魚種", "尾數", "處理方式", "照片", "售價"].forEach(function (label) {
    assert.match(result.replies[0].text, new RegExp(label));
  });
  assert.doesNotMatch(result.replies[0].text, /總重|重量/);
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
  const result = editing.chooseEditField(context(), "尾數");
  assert.equal(result.context.editing.slot, "quantity");
  assert.equal(result.context.choosing_edit, null);
  assert.match(result.replies[0].text, /新的尾數/);
});

test("一句話含欄位與新值就直接改", function () {
  const result = editing.chooseEditField(context(), "尾數改成 10 尾");
  assert.equal(result.context.editing, null);
  assert.equal(result.context.draft.quantity, 10);
  assert.equal(result.context.market_quoted, true);
  assert.match(result.replies[0].text, /已更新尾數/);
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

test("售價可以一句話改，整批為必填", function () {
  const result = editing.chooseEditField(context(), "售價改成 1250");
  assert.equal(result.context.draft.price, 1250);
  assert.equal(result.context.draft.price_per_taijin, 200);

  const perTaijinOnly = editing.chooseEditField(
    context({ draft: draft({ price: null, price_per_taijin: null }) }),
    "售價改成每台斤 250"
  );
  assert.equal(perTaijinOnly.context.draft.price, null);
  assert.match(perTaijinOnly.replies[0].text, /請提供整批售價/);
});

test("一句話講多個欄位只套用第一個", function () {
  const result = editing.chooseEditField(context(), "魚種改成鮪魚、尾數改成 3 尾");
  assert.equal(result.context.draft.fish_species, "鮪魚");
  assert.equal(result.context.draft.quantity, 2);
});

test("欄位值本身可以含頓號，不會被當成下一個欄位", function () {
  const result = editing.chooseEditField(context(), "處理方式改成三去、真空");
  assert.equal(result.context.draft.condition, "三去、真空");
});

test("修改草稿中途取消回到修改前草稿", function () {
  const started = editing.beginEdit(context(), "quantity");
  const result = editing.editText(started.context, "取消");
  assert.equal(result.context.editing, null);
  assert.equal(result.context.draft.quantity, 2);
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
