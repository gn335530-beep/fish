/* listing 多欄位修改：一次套用、整批原子驗證、修正歷史與確認字串保留。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop } = require("./client");
const h = require("./ai-reply-helpers");
const { raw, seedCatalog, resetCatalog } = require("./market-catalog-helpers");

const ROWS = [raw({ "品種代碼": 2101, "魚貨名稱": "鬼頭刀" })];

function draft(overrides) {
  return Object.assign({
    client_request_id: "pub_x",
    fish_species: "鬼頭刀",
    species_code: 2101,
    quantity: null,
    condition: "放血冰鎮",
    photo_url: "/uploads/a.jpg",
    price: null,
    price_per_taijin: null
  }, overrides || {});
}

function listingContext(draftValue, overrides) {
  return Object.assign({ mode: "listing", draft: draftValue, last_cards: [] }, overrides || {});
}

test.before(start);
test.after(stop);
test.beforeEach(function () {
  resetCatalog();
  seedCatalog(ROWS);
  h.reset({ LLM_ENABLED: "true", GEMINI_API_KEY: "test-key" });
});
test.after(resetCatalog);

test("一句話明確提到多個欄位時一次套用", async function () {
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "2尾、活體、整批3000");
  h.useJson({
    reply_text: "好的，已更新尾數、處理方式與售價。",
    draft_changes: { quantity: 2, condition: "活體", price: 3000 },
    next_action: "ask"
  });

  const result = await h.reply(room.id, message.id, undefined, listingContext(draft()));
  const changes = result.body.data.listing.draft_changes;
  assert.equal(changes.quantity, 2);
  assert.equal(changes.condition, "活體");
  assert.equal(changes.price, 3000);
});

test("批次中有一個無效欄位時整批丟棄，不改半套", async function () {
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "2尾、活體");
  h.useJson({
    reply_text: "好的。",
    draft_changes: { quantity: 5, condition: "活體" },
    next_action: "ask"
  });

  const result = await h.reply(room.id, message.id, undefined, listingContext(draft()));
  assert.equal(result.body.data.handled, false);
  assert.equal(result.body.data.error_code, "LLM_GUARD_REJECTED");
});

test("只改模型回傳的欄位，不動其他草稿內容", async function () {
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "2尾");
  h.useJson({
    reply_text: "好的，已更新尾數。",
    draft_changes: { quantity: 2 },
    next_action: "ask"
  });

  const ctx = listingContext(draft({ condition: "三去真空" }));
  const result = await h.reply(room.id, message.id, undefined, ctx);
  const changes = result.body.data.listing.draft_changes;
  assert.equal(changes.quantity, 2);
  assert.equal("condition" in changes, false);
  assert.equal("price" in changes, false);
});

test("多欄位修改後仍保留修正歷史與使用者確認字串", async function () {
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "鬼投刀、2尾");
  h.useJson({
    reply_text: "我把魚種「鬼投刀」修正為「鬼頭刀」，並更新尾數。",
    corrections: [{ field: "fish_species", original: "鬼投刀", corrected: "鬼頭刀" }],
    draft_changes: { fish_species: "鬼投刀", quantity: 2 },
    next_action: "ask"
  });

  const ctx = listingContext(draft({ fish_species: "鬼投刀" }), {
    protected_names: ["外星魚"],
    correction_history: [{ field: "condition", original: "放血", corrected: "放血冰鎮", time: "2026-11-01T00:00:00.000Z" }]
  });
  const result = await h.reply(room.id, message.id, undefined, ctx);
  const listing = result.body.data.listing;
  assert.equal(listing.draft_changes.fish_species, "鬼頭刀");
  assert.equal(listing.draft_changes.quantity, 2);
  assert.equal(listing.draft_changes.species_code, 2101);
  assert.deepEqual(listing.protected_names, ["外星魚"]);
  assert.equal(listing.correction_history.length, 2);
  assert.equal(listing.correction_history[1].field, "fish_species");
});
