/* 上架批次追問：第一次列出所有缺的非價格欄位，不先問價格。 */

import test from "node:test";
import assert from "node:assert/strict";

const SPECIES = [
  { id: "grouper", name: "石斑", alias: [], category: "fish", texture: "", bones: "刺少", cooking: ["清蒸"] },
  { id: "cuttlefish", name: "花枝", alias: [], category: "ceph", texture: "", bones: "無刺", cooking: ["炒"] }
];

globalThis.window = {
  HaisenAPI: {
    listSpecies: async function () { return SPECIES; }
  }
};

const { loadSpecies } = await import("../assets/js/demo/ai/species.js");
const service = await import("../assets/js/demo/ai/service.js");
await loadSpecies();

const USER = { seller_terms_accepted_at: "2026-10-27T00:00:00.000Z" };

function textOf(result) {
  return result.replies.map(function (reply) { return reply.text || ""; }).join("\n");
}

test("說要賣花枝時列出重量、尾數、處理方式與照片，不問價格", async function () {
  const result = await service.handleText(null, "我要賣花枝", USER);
  const text = textOf(result);
  assert.match(text, /重量/);
  assert.match(text, /尾數/);
  assert.match(text, /處理方式/);
  assert.match(text, /照片/);
  assert.doesNotMatch(text, /魚種/);
  assert.doesNotMatch(text, /價格|多少錢|售價/);
});

test("還沒說魚種時把魚種也列進第一批追問", async function () {
  const result = await service.handleText(null, "我要賣魚", USER);
  const text = textOf(result);
  assert.match(text, /魚種/);
  assert.match(text, /重量/);
  assert.match(text, /尾數/);
  assert.match(text, /處理方式/);
  assert.match(text, /照片/);
  assert.doesNotMatch(text, /價格|多少錢|售價/);
});

test("未知魚種保留原字串，不再追問魚種", async function () {
  const result = await service.handleText(null, "我要賣鮭魚", USER);
  assert.equal(result.context.draft.fish_species, "鮭魚");
  assert.doesNotMatch(textOf(result), /魚種/);
  assert.match(textOf(result), /重量/);
});

test("第一次已補齊非價格欄位時只追照片，不問價格", async function () {
  const result = await service.handleText(null, "我要賣花枝 3公斤 2尾 放血冰鎮", USER);
  const text = textOf(result);
  assert.match(text, /還需要一張照片/);
  assert.doesNotMatch(text, /價格|多少錢|售價/);
});

test("照片補齊後才問售價，且可回每台斤或整批", async function () {
  const started = await service.handleText(null, "我要賣花枝 3公斤 2尾 放血冰鎮", USER);
  const photographed = await service.handlePhoto(started.context, "/uploads/a.jpg", USER);
  assert.match(textOf(photographed), /每台斤價格或整批價格/);
  assert.equal(photographed.context.draft.photo_url, "/uploads/a.jpg");
});

test("一次補齊含每台斤售價時直接進草稿卡", async function () {
  const started = await service.handleText(null, "我要賣花枝 3公斤 2尾 放血冰鎮 每台斤 200", USER);
  const photographed = await service.handlePhoto(started.context, "/uploads/a.jpg", USER);
  assert.equal(photographed.context.draft.price_per_taijin, 200);
  assert.equal(photographed.context.draft.price_auto, true);
  assert.equal(photographed.context.draft.price, 1000);
  assert.ok(photographed.replies.some(function (reply) {
    return reply.card && reply.card.type === "draft";
  }));
});
