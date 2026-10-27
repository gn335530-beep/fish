/* 裸數字判定：明確標記優先，消去法只補重量／尾數，價格只在價格步驟或明講時寫入。 */

import test from "node:test";
import assert from "node:assert/strict";

const SPECIES = [
  { id: "cuttlefish", name: "花枝", alias: [], category: "ceph", texture: "", bones: "無刺", cooking: ["炒"] }
];

globalThis.window = {
  HaisenAPI: {
    listSpecies: async function () { return SPECIES; }
  }
};

const { loadSpecies } = await import("../assets/js/demo/ai/species.js");
const slots = await import("../assets/js/demo/ai/slots.js");
const service = await import("../assets/js/demo/ai/service.js");
await loadSpecies();

const USER = { seller_terms_accepted_at: "2026-10-27T00:00:00.000Z" };

function textOf(result) {
  return result.replies.map(function (reply) { return reply.text || ""; }).join("\n");
}

test("有尾數單位的裸數字以消去法補重量", function () {
  const found = slots.extractSlots("25 2尾", null);
  assert.equal(found.weight_kg, 25);
  assert.equal(found.quantity, 2);
  assert.equal(found.price, undefined);
  assert.equal(found.price_per_taijin, undefined);

  assert.equal(slots.extractSlots("250 2尾", null).weight_kg, 250);
});

test("有重量單位的裸數字以消去法補尾數", function () {
  const found = slots.extractSlots("3公斤 2", null);
  assert.equal(found.weight_kg, 3);
  assert.equal(found.quantity, 2);
});

test("單獨的裸數字回問重量或尾數，不寫入欄位", async function () {
  const result = await service.handleText(null, "我要賣花枝 25", USER);

  assert.equal(result.context.pending_number, 25);
  assert.equal(result.context.draft.weight_kg, null);
  assert.equal(result.context.draft.quantity, null);
  assert.equal(textOf(result), "25 是指重量（公斤），還是數量（尾）？");

  const answered = await service.handleText(result.context, "重量", USER);
  assert.equal(answered.context.pending_number, null);
  assert.equal(answered.context.draft.weight_kg, 25);
  assert.equal(answered.context.draft.quantity, null);
  assert.match(textOf(answered), /尾數/);
});

test("回答尾數時把待確認數字補進尾數", async function () {
  const asked = await service.handleText(null, "我要賣花枝 25", USER);
  const answered = await service.handleText(asked.context, "尾數", USER);

  assert.equal(answered.context.draft.quantity, 25);
  assert.equal(answered.context.draft.weight_kg, null);
});

test("四位數以上的裸數字不補重量，也不當價格", async function () {
  const found = slots.extractSlots("2尾 9000", null);
  assert.equal(found.quantity, 2);
  assert.equal(found.weight_kg, undefined);
  assert.equal(found.price, undefined);

  const result = await service.handleText(null, "我要賣花枝 2尾 9000", USER);
  assert.equal(result.context.pending_number, null);
  assert.equal(result.context.draft.quantity, 2);
  assert.equal(result.context.draft.weight_kg, null);
  assert.equal(result.context.draft.price, null);
});

test("明確價格標記才在任何時候寫入價格", function () {
  assert.equal(slots.extractSlots("9000元", null).price, 9000);
  assert.equal(slots.extractSlots("整批 9000", null).price, 9000);
  assert.equal(slots.extractSlots("價格 9000", null).price, 9000);
  assert.equal(slots.extractSlots("售價 9000", null).price, 9000);
});

test("價格步驟的裸數字才寫入價格", async function () {
  const started = await service.handleText(null, "我要賣花枝 3公斤 2尾 放血冰鎮", USER);
  const photographed = await service.handlePhoto(started.context, "/uploads/a.jpg", USER);
  assert.match(textOf(photographed), /多少錢/);

  const priced = await service.handleText(photographed.context, "9000", USER);
  assert.equal(priced.context.draft.price, 9000);
  assert.equal(priced.context.pending_number, null);
});

test("台斤換算與無單位小數維持原行為", function () {
  assert.equal(slots.extractSlots("2台斤", null).weight_kg, 1.2);
  assert.equal(slots.extractSlots("4.5", null).weight_kg, 4.5);
});

test("消去法不套用到四位數以上的裸數字", function () {
  const found = slots.extractSlots("2尾 1000", null);
  assert.equal(found.quantity, 2);
  assert.equal(found.weight_kg, undefined);
});

test("重量保留輸入精度，自動計算才不會先被進位", function () {
  assert.equal(slots.extractSlots("4.55公斤", null).weight_kg, 4.55);
  assert.equal(slots.extractSlots("2台斤", null).weight_kg, 1.2);
});

test("價格步驟保留明確輸入的小數", async function () {
  const started = await service.handleText(null, "我要賣花枝 3公斤 2尾 放血冰鎮", USER);
  const photographed = await service.handlePhoto(started.context, "/uploads/a.jpg", USER);
  const priced = await service.handleText(photographed.context, "999.5", USER);
  assert.equal(priced.context.draft.price, 999.5);
});

test("每台斤與整批雙價仍可同時抽出", function () {
  const both = slots.extractSlots("每台斤 200，整批 1000", null);
  assert.equal(both.price_per_taijin, 200);
  assert.equal(both.price, 1000);
});
