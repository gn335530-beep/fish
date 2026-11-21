/* listing 模式：模型驅動的上架草稿變更契約、數字防護與錯誤分流。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");
const h = require("./ai-reply-helpers");
const { raw, seedCatalog, resetCatalog } = require("./market-catalog-helpers");

const ROWS = [
  raw({ "品種代碼": 2101, "魚貨名稱": "鬼頭刀" }),
  raw({ "品種代碼": 2201, "魚貨名稱": "石斑魚" })
];

const DRAFT = {
  client_request_id: "pub_x",
  fish_species: "鬼頭刀",
  species_code: 1234,
  quantity: null,
  condition: "放血冰鎮",
  photo_url: "/uploads/a.jpg",
  price: null,
  price_per_taijin: null
};

function listingContext(overrides) {
  return Object.assign({
    mode: "listing",
    draft: DRAFT,
    last_cards: [],
    market_quoted: false
  }, overrides || {});
}

test.before(start);
test.after(stop);
test.beforeEach(function () {
  resetCatalog();
  seedCatalog(ROWS);
  h.reset({ LLM_ENABLED: "true", GEMINI_API_KEY: "test-key" });
});
test.after(resetCatalog);

test("模型回傳尾數時，回傳契約含草稿變更與下一個動作", async function () {
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "3尾");
  h.useJson({
    reply_text: "好的，已更新為 3 尾。",
    draft_changes: { quantity: 3 },
    next_action: "ask"
  });

  const result = await h.reply(room.id, message.id, undefined, listingContext());
  assert.equal(result.status, 200);
  const body = result.body.data;
  assert.equal(body.handled, true);
  assert.ok(body.listing, "listing 模式要回 listing 契約");
  assert.equal(body.listing.draft_changes.quantity, 3);
  assert.equal(body.listing.reply_text, "好的，已更新為 3 尾。");
  assert.equal(body.listing.next_action, "ask");
  assert.deepEqual(body.listing.corrections, []);
  assert.deepEqual(body.listing.correction_history, []);
  assert.deepEqual(body.listing.protected_names, []);
  assert.equal(body.listing.condition_proposal, null);
});

test("尾數不在釣客訊息中時，丟棄該輪並回 LLM_GUARD_REJECTED", async function () {
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "好的");
  h.useJson({
    reply_text: "好的，已更新為 5 尾。",
    draft_changes: { quantity: 5 },
    next_action: "ask"
  });

  const result = await h.reply(room.id, message.id, undefined, listingContext());
  assert.equal(result.status, 200);
  assert.equal(result.body.data.handled, false);
  assert.equal(result.body.data.error_code, "LLM_GUARD_REJECTED");
});

test("草稿變更不接受白名單以外的欄位", async function () {
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "3尾");
  h.useJson({
    reply_text: "好的。",
    draft_changes: { quantity: 3, status: "LISTED" },
    next_action: "ask"
  });

  const result = await h.reply(room.id, message.id, undefined, listingContext());
  assert.equal(result.status, 200);
  assert.equal(result.body.data.handled, false);
  assert.equal(result.body.data.error_code, "LLM_GUARD_REJECTED");
});

test("草稿未完成時，模型要求顯示草稿卡會降級為 ask", async function () {
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "3尾");
  h.useJson({
    reply_text: "好的。",
    draft_changes: { quantity: 3 },
    next_action: "show_draft_card"
  });

  const result = await h.reply(room.id, message.id, undefined, listingContext());
  assert.equal(result.body.data.handled, true);
  assert.equal(result.body.data.listing.next_action, "ask");
});

test("修正記錄會併入既有 correction_history 並帶時間", async function () {
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "鬼頭刀");
  h.useJson({
    reply_text: "我把魚種「鬼投刀」修正為「鬼頭刀」。",
    corrections: [{ field: "fish_species", original: "鬼投刀", corrected: "鬼頭刀" }],
    draft_changes: { fish_species: "鬼頭刀" },
    next_action: "ask"
  });

  const ctx = listingContext({
    draft: Object.assign({}, DRAFT, { fish_species: "鬼投刀" }),
    correction_history: [{ field: "condition", original: "放血", corrected: "放血冰鎮", time: "2026-11-01T00:00:00.000Z" }]
  });
  const result = await h.reply(room.id, message.id, undefined, ctx);
  const listing = result.body.data.listing;
  assert.equal(listing.corrections.length, 1);
  assert.equal(listing.correction_history.length, 2);
  assert.equal(listing.correction_history[1].field, "fish_species");
  assert.ok(listing.correction_history[1].time);
});

test("交易房不呼叫 LLM，仍回 NOT_ASSISTANT_ROOM", async function () {
  const asked = await call("POST", "/api/deals/initiate-room", {
    token: tokens.buyer,
    body: { seller_id: 1 }
  });
  const dealRoom = asked.body.data.conversation;
  const message = await h.sendUser(dealRoom.id, "三尾");
  const result = await h.reply(dealRoom.id, message.id, tokens.buyer, listingContext());
  assert.equal(result.status, 409);
  assert.equal(result.body.code, "NOT_ASSISTANT_ROOM");
});

test("LLM_ENABLED 關閉時 listing 模式回 LLM_DISABLED，不呼叫 provider", async function () {
  h.reset({ LLM_ENABLED: false });
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "三尾");
  const result = await h.reply(room.id, message.id, undefined, listingContext());
  assert.equal(result.status, 200);
  assert.equal(result.body.data.handled, false);
  assert.equal(result.body.data.error_code, "LLM_DISABLED");
  assert.equal(h.calls.length, 0);
});
