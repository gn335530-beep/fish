/* 商品售價：整批必填、每台斤選填、不再自動計算與草稿卡顯示。 */

import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = {};

const slots = await import("../assets/js/demo/ai/slots.js");
const draftApi = await import("../assets/js/demo/ai/draft.js");
const cards = await import("../assets/js/demo/views/cards.js");

test("只填每台斤時不自動計算整批", function () {
  const draft = draftApi.mergeDraft({}, { price_per_taijin: 200 });
  assert.equal(draft.price_per_taijin, 200);
  assert.equal(draft.price, null);
});

test("只填整批時每台斤留空", function () {
  const draft = draftApi.mergeDraft({}, { price: 1000 });
  assert.equal(draft.price, 1000);
  assert.equal(draft.price_per_taijin, null);
});

test("先填每台斤再補整批時兩者都保留", function () {
  const draft = draftApi.mergeDraft({}, { price_per_taijin: 200 });
  const both = draftApi.mergeDraft(draft, { price: 1000 });
  assert.equal(both.price, 1000);
  assert.equal(both.price_per_taijin, 200);
});

test("兩者都填時都保留，整批可為折扣", function () {
  const draft = draftApi.mergeDraft({}, { price: 1000, price_per_taijin: 200 });
  assert.equal(draft.price, 1000);
  assert.equal(draft.price_per_taijin, 200);
});

test("已有整批價時再補每台斤，保留折扣不重算", function () {
  const withBatch = draftApi.mergeDraft({}, { price: 1000 });
  const withBoth = draftApi.mergeDraft(withBatch, { price_per_taijin: 200 });
  assert.equal(withBoth.price, 1000);
  assert.equal(withBoth.price_per_taijin, 200);
});

test("句子可以抽出每台斤、整批或兩者", function () {
  assert.equal(slots.extractSlots("每台斤 200", "price").price_per_taijin, 200);
  assert.equal(slots.extractSlots("整批 1000", "price").price, 1000);
  const both = slots.extractSlots("每台斤 200，整批 1000", null);
  assert.equal(both.price_per_taijin, 200);
  assert.equal(both.price, 1000);
});

test("送後端時送出整批價，每台斤有值才送，也不再送重量", function () {
  const draft = draftApi.mergeDraft({}, { price: 1000, price_per_taijin: 200 });
  const payload = draftApi.draftToProduct(draft, { city: "高雄市" });
  assert.equal(payload.price, 1000);
  assert.equal(payload.price_per_taijin, 200);
  assert.equal("weight_kg" in payload, false);
  assert.equal("price_auto" in payload, false);

  const batchOnly = draftApi.draftToProduct(draftApi.mergeDraft({}, { price: 1000 }), { city: "高雄市" });
  assert.equal(batchOnly.price, 1000);
  assert.equal("price_per_taijin" in batchOnly, false);
});

test("發布商品時送出 species_code", function () {
  const draft = draftApi.mergeDraft({
    fish_species: "土魠", quantity: 2,
    condition: "放血冰鎮", photo_url: "/uploads/a.jpg", price: 1000
  }, { species_code: 2141 });
  const payload = draftApi.draftToProduct(draft, { city: "高雄市" });
  assert.equal(payload.fish_species, "土魠");
  assert.equal(payload.species_code, 2141);
  assert.equal("species_id" in payload, false);
  assert.equal("species_latin" in payload, false);
});

test("草稿卡分別標明整批、每台斤與每尾均價，不標自動計算", function () {
  const html = cards.renderCard({
    type: "draft",
    draft: {
      fish_species: "石斑",
      quantity: 2,
      condition: "放血冰鎮",
      photo_url: "/uploads/a.jpg",
      price: 1500,
      price_per_taijin: 200
    }
  });
  assert.match(html, /整批售價/);
  assert.match(html, /NT\$1,500/);
  assert.match(html, /每台斤/);
  assert.match(html, /NT\$200/);
  assert.match(html, /每尾均價/);
  assert.match(html, /NT\$750/);
  assert.doesNotMatch(html, /自動計算/);
});
