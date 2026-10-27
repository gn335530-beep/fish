/* 處理方式自由文字：提示詞只舉例，回答照原樣記錄，不再做同義詞對照。 */

import test from "node:test";
import assert from "node:assert/strict";

const SPECIES = [
  { id: "grouper", name: "石斑", alias: [], category: "fish", texture: "", bones: "刺少", cooking: ["清蒸"] }
];

globalThis.window = {
  HaisenAPI: {
    listSpecies: async function () { return SPECIES; }
  }
};

const { loadSpecies } = await import("../assets/js/demo/ai/species.js");
const { extractSlots } = await import("../assets/js/demo/ai/slots.js");
const { beginEdit } = await import("../assets/js/demo/ai/editing.js");
const service = await import("../assets/js/demo/ai/service.js");
await loadSpecies();

const USER = { seller_terms_accepted_at: "2026-10-27T00:00:00.000Z" };

function textOf(result) {
  return result.replies.map(function (reply) { return reply.text || ""; }).join("\n");
}

test("詢問處理方式時只舉例活體與放血冰鎮", async function () {
  const started = await service.handleText(null, "我要賣魚", USER);
  const asked = await service.handleText(started.context, "石斑 3公斤 2尾", USER);
  const text = textOf(asked);
  assert.match(text, /活體、放血冰鎮/);
  assert.doesNotMatch(text, /三去處理/);
  assert.doesNotMatch(text, /冷凍/);
});

test("使用者的回答照原樣記錄，不做活魚→活體對照", async function () {
  const started = await service.handleText(null, "我要賣魚", USER);
  const asked = await service.handleText(started.context, "石斑 3公斤 2尾", USER);
  const answered = await service.handleText(asked.context, "活魚", USER);
  assert.equal(answered.context.draft.condition, "活魚");
});

test("冷凍、自行處理等自由文字都能進草稿", function () {
  assert.equal(extractSlots("冷凍。", "condition").condition, "冷凍");
  assert.equal(extractSlots("我自己處理", "condition").condition, "我自己處理");
  assert.equal(extractSlots("放血冰鎮", "condition").condition, "放血冰鎮");
});

test("一般句子仍可抽出處理方式與其他欄位", function () {
  const found = extractSlots("石斑 3公斤 2尾 冷凍", null);
  assert.equal(found.fish_species, "石斑");
  assert.equal(found.weight_kg, 3);
  assert.equal(found.quantity, 2);
  assert.equal(found.condition, "冷凍");

  const live = extractSlots("石斑 3公斤 2尾 活魚", null);
  assert.equal(live.condition, "活魚");

  const killed = extractSlots("石斑 3公斤 2尾 已經殺好了", null);
  assert.equal(killed.condition, "殺好");
});

test("處理方式保留原句片段，不截成白名單第一個詞", function () {
  const found = extractSlots("3公斤 2尾 放血後冰鎮", null);
  assert.equal(found.condition, "放血後冰鎮");

  const full = extractSlots("我要賣石斑 3公斤 2尾 放血後冰鎮", null);
  assert.equal(full.condition, "放血後冰鎮");
});

test("未知說法保留原句，不丟棄也不改成白名單", function () {
  const found = extractSlots("石斑 3公斤 2尾 我自己處理", null);
  assert.equal(found.condition, "我自己處理");
});

test("常見處理說法仍可辨識", function () {
  assert.equal(extractSlots("石斑 3公斤 2尾 活體", null).condition, "活體");
  assert.equal(extractSlots("石斑 3公斤 2尾 放血冰鎮", null).condition, "放血冰鎮");
  assert.equal(extractSlots("石斑 3公斤 2尾 三去處理", null).condition, "三去處理");
});

test("處理方式在魚種前後都不會夾帶魚種名稱", function () {
  assert.equal(extractSlots("活體石斑 3公斤 2尾", null).condition, "活體");
  assert.equal(extractSlots("冰鎮石斑 3公斤 2尾", null).condition, "冰鎮");
});

test("處理方式不會夾帶後面的裸數字", function () {
  const found = extractSlots("石斑 3公斤 2尾 放血後冰鎮 500", "price");
  assert.equal(found.condition, "放血後冰鎮");
});

test("草稿卡完整顯示處理方式原句", async function () {
  const { renderCard } = await import("../assets/js/demo/views/cards.js");
  const html = renderCard({
    type: "draft",
    draft: {
      fish_species: "石斑", weight_kg: 3, quantity: 2,
      condition: "放血後冰鎮", price: 1000, price_per_taijin: null
    }
  });
  assert.match(html, /放血後冰鎮/);
});

test("修改草稿的處理方式提示也不再列固定選項", function () {
  const result = beginEdit({
    mode: "listing",
    draft: { fish_species: "石斑", condition: "活體" }
  }, "condition");
  assert.match(textOf(result), /例如：活體、放血冰鎮/);
  assert.doesNotMatch(textOf(result), /三去處理|冷凍/);
});
