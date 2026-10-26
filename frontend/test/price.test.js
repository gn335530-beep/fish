/* 商品售價：每台斤、整批、自動計算與草稿卡顯示。 */

import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = {};

const slots = await import("../assets/js/demo/ai/slots.js");
const draftApi = await import("../assets/js/demo/ai/draft.js");
const editing = await import("../assets/js/demo/ai/editing.js");
const cards = await import("../assets/js/demo/views/cards.js");

test("只填每台斤時自動計算整批並標記", function () {
  const draft = draftApi.mergeDraft({ weight_kg: 4.5 }, { price_per_taijin: 200 });
  assert.equal(draft.price_per_taijin, 200);
  assert.equal(draft.price, 1500);
  assert.equal(draft.price_auto, true);
  assert.equal(draftApi.draftReady(Object.assign({}, draft, {
    fish_species: "石斑", quantity: 1, condition: "放血冰鎮", photo_url: "/uploads/a.jpg"
  })), true);
});

test("只填整批時每台斤留空、不自動計算", function () {
  const draft = draftApi.mergeDraft({ weight_kg: 4.5, price_per_taijin: 200, price_auto: true }, {
    price: 1000
  });
  assert.equal(draft.price, 1000);
  assert.equal(draft.price_per_taijin, null);
  assert.equal(draft.price_auto, false);
});

test("兩者都填時都保留，整批可為折扣", function () {
  const draft = draftApi.mergeDraft({ weight_kg: 4.5 }, {
    price: 1000,
    price_per_taijin: 200
  });
  assert.equal(draft.price, 1000);
  assert.equal(draft.price_per_taijin, 200);
  assert.equal(draft.price_auto, false);
});

test("已有明確整批價時再補每台斤，保留折扣不重算", function () {
  const withBatch = draftApi.mergeDraft({ weight_kg: 4.5 }, { price: 1000 });
  const withBoth = draftApi.mergeDraft(withBatch, { price_per_taijin: 200 });
  assert.equal(withBoth.price, 1000);
  assert.equal(withBoth.price_per_taijin, 200);
  assert.equal(withBoth.price_auto, false);
});

test("修改重量會重算自動整批", function () {
  const context = {
    mode: "listing",
    draft: Object.assign(draftApi.mergeDraft({ weight_kg: 3 }, { price_per_taijin: 200 }), {
      fish_species: "石斑",
      quantity: 1,
      condition: "放血冰鎮",
      photo_url: "/uploads/a.jpg"
    })
  };
  const editingContext = editing.beginEdit(context, "weight_kg").context;
  const result = editing.editText(editingContext, "5 公斤");
  assert.equal(result.context.draft.price_auto, true);
  assert.equal(result.context.draft.price, 1667);
  assert.equal(result.context.draft.price_per_taijin, 200);
});

test("自動計算後改重量會重新算整批", function () {
  const draft = draftApi.mergeDraft({ weight_kg: 4.5 }, { price_per_taijin: 200 });
  const next = draftApi.mergeDraft(draft, { weight_kg: 3 });
  assert.equal(next.price_auto, true);
  assert.equal(next.price, 1000);
});

test("句子可以抽出每台斤、整批或兩者", function () {
  assert.equal(slots.extractSlots("每台斤 200", "price").price_per_taijin, 200);
  assert.equal(slots.extractSlots("整批 1000", "price").price, 1000);
  const both = slots.extractSlots("每台斤 200，整批 1000", null);
  assert.equal(both.price_per_taijin, 200);
  assert.equal(both.price, 1000);
});

test("送後端時只填每台斤就不送整批，讓後端計算", function () {
  const auto = draftApi.mergeDraft({ weight_kg: 4.5 }, { price_per_taijin: 200 });
  const autoPayload = draftApi.draftToProduct(auto, { city: "高雄市" });
  assert.equal(autoPayload.price, undefined);
  assert.equal(autoPayload.price_per_taijin, 200);

  const explicit = draftApi.mergeDraft({ weight_kg: 4.5 }, { price: 1000, price_per_taijin: 200 });
  const explicitPayload = draftApi.draftToProduct(explicit, { city: "高雄市" });
  assert.equal(explicitPayload.price, 1000);
  assert.equal(explicitPayload.price_per_taijin, 200);
});

test("草稿卡分別標明整批、每台斤與每尾均價", function () {
  const html = cards.renderCard({
    type: "draft",
    draft: {
      fish_species: "石斑",
      weight_kg: 4.5,
      quantity: 2,
      condition: "放血冰鎮",
      photo_url: "/uploads/a.jpg",
      price: 1500,
      price_per_taijin: 200,
      price_auto: true
    }
  });
  assert.match(html, /整批售價/);
  assert.match(html, /NT\$1,500（自動計算）/);
  assert.match(html, /每台斤/);
  assert.match(html, /NT\$200/);
  assert.match(html, /每尾均價/);
  assert.match(html, /NT\$750/);
});
