/* 裸數字判定：明確單位優先，價格只在價格步驟或明講時寫入；重量不再收集。 */

import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = { HaisenAPI: {} };

const slots = await import("../assets/js/demo/ai/slots.js");
const service = await import("../assets/js/demo/ai/service.js");

const USER = { seller_terms_accepted_at: "2026-10-27T00:00:00.000Z" };

function textOf(result) {
  return result.replies.map(function (reply) { return reply.text || ""; }).join("\n");
}

test("有尾數單位時以尾數為準，其餘裸數字不補重量", function () {
  const found = slots.extractSlots("25 2尾", null);
  assert.equal(found.quantity, 2);
  assert.equal(found.weight_kg, undefined);
  assert.equal(found.price, undefined);
  assert.equal(found.price_per_taijin, undefined);
});

test("重量單位不再收集，但也不會被當成尾數", function () {
  const found = slots.extractSlots("3公斤 2", null);
  assert.equal(found.quantity, 2);
  assert.equal(found.weight_kg, undefined);
  assert.equal(slots.extractSlots("3公斤", null).quantity, undefined);
});

test("單獨一個裸數字直接當尾數", async function () {
  const result = await service.handleText(null, "我要賣花枝 25", USER);

  assert.equal(result.context.draft.quantity, 25);
  assert.equal(result.context.draft.weight_kg, undefined);
  assert.doesNotMatch(textOf(result), /重量|公斤|尾數/);
});

test("多個無單位數字不猜，直接重問尾數", async function () {
  const found = slots.extractSlots("1 2", "quantity");
  assert.equal(found.quantity, undefined);

  const started = await service.handleText(null, "我要賣花枝", USER);
  const asked = await service.handleText(started.context, "1 2", USER);
  assert.equal(asked.context.draft.quantity, null);
  assert.match(textOf(asked), /總共幾尾/);
});

test("回答追問的單一裸數字會補進尾數", function () {
  assert.equal(slots.extractSlots("1", "quantity").quantity, 1);
});

test("處理方式只填數字會重問，不會寫進草稿", async function () {
  assert.deepEqual(slots.extractSlots("1 2", "condition"), {});
  assert.deepEqual(slots.extractSlots("3公斤 2尾 1", "condition"), {});

  const started = await service.handleText(null, "我要賣花枝 2尾", USER);
  const asked = await service.handleText(started.context, "1 2", USER);

  assert.equal(asked.context.draft.condition, "");
  assert.match(textOf(asked), /處理方式/);
});

test("四位數以上的裸數字不當尾數，也不當價格", async function () {
  const found = slots.extractSlots("2尾 9000", null);
  assert.equal(found.quantity, 2);
  assert.equal(found.price, undefined);

  const result = await service.handleText(null, "我要賣花枝 2尾 9000", USER);
  assert.equal(result.context.draft.quantity, 2);
  assert.equal(result.context.draft.price, null);
});

test("明確價格標記才在任何時候寫入價格", function () {
  assert.equal(slots.extractSlots("9000元", null).price, 9000);
  assert.equal(slots.extractSlots("整批 9000", null).price, 9000);
  assert.equal(slots.extractSlots("價格 9000", null).price, 9000);
  assert.equal(slots.extractSlots("售價 9000", null).price, 9000);
});

test("價格步驟的裸數字才寫入價格", async function () {
  const started = await service.handleText(null, "我要賣花枝 2尾 放血冰鎮", USER);
  const photographed = await service.handlePhoto(started.context, "/uploads/a.jpg", USER);
  assert.match(textOf(photographed), /整批要賣多少錢/);

  const priced = await service.handleText(photographed.context, "9000", USER);
  assert.equal(priced.context.draft.price, 9000);
});

test("無單位小數不當尾數", function () {
  assert.equal(slots.extractSlots("4.5", null).quantity, undefined);
});

test("每台斤與整批雙價仍可同時抽出", function () {
  const both = slots.extractSlots("每台斤 200，整批 1000", null);
  assert.equal(both.price_per_taijin, 200);
  assert.equal(both.price, 1000);
});
