/* listing 卡片時機：行情卡、草稿卡與「想修改直接告訴我」提示。 */

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

function listingContext(draftValue) {
  return { mode: "listing", draft: draftValue, last_cards: [] };
}

test.before(start);
test.after(stop);
test.beforeEach(function () {
  resetCatalog();
  seedCatalog(ROWS);
  h.reset({ LLM_ENABLED: "true", GEMINI_API_KEY: "test-key" });
});
test.after(resetCatalog);

test("非價格欄位未完成時，行情卡降級為 ask", async function () {
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "2尾");
  h.useJson({
    reply_text: "好的。",
    draft_changes: { quantity: 2 },
    next_action: "show_market_card"
  });

  const result = await h.reply(room.id, message.id, undefined,
    listingContext(draft({ photo_url: "" })));
  assert.equal(result.body.data.handled, true);
  assert.equal(result.body.data.listing.next_action, "ask");
});

test("非價格欄位完成且尚未問售價時，保留行情卡", async function () {
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "2尾");
  h.useJson({
    reply_text: "目前行情如下，整批要賣多少？",
    draft_changes: { quantity: 2 },
    next_action: "show_market_card"
  });

  const result = await h.reply(room.id, message.id, undefined, listingContext(draft()));
  assert.equal(result.body.data.listing.next_action, "show_market_card");
});

test("售價尚未完成時，草稿卡降級為 ask", async function () {
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "2尾");
  h.useJson({
    reply_text: "資料快齊了。",
    draft_changes: { quantity: 2 },
    next_action: "show_draft_card"
  });

  const result = await h.reply(room.id, message.id, undefined, listingContext(draft()));
  assert.equal(result.body.data.listing.next_action, "ask");
});

test("所有欄位完成後顯示草稿卡，並補上「想修改直接告訴我」", async function () {
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "整批3000");
  h.useJson({
    reply_text: "資料都齊了，請確認內容後按「確認上架」。",
    draft_changes: { price: 3000 },
    next_action: "show_draft_card"
  });

  const ctx = listingContext(draft({ quantity: 2 }));
  const result = await h.reply(room.id, message.id, undefined, ctx);
  const listing = result.body.data.listing;
  assert.equal(listing.next_action, "show_draft_card");
  assert.match(listing.reply_text, /想修改直接告訴我/);
});

test("模型已寫提示時不重複附加", async function () {
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "整批3000");
  h.useJson({
    reply_text: "資料都齊了。想修改直接告訴我。",
    draft_changes: { price: 3000 },
    next_action: "show_draft_card"
  });

  const ctx = listingContext(draft({ quantity: 2 }));
  const result = await h.reply(room.id, message.id, undefined, ctx);
  const matches = result.body.data.listing.reply_text.match(/想修改直接告訴我/g) || [];
  assert.equal(matches.length, 1);
});

test("模型上下文列出缺少欄位，售價排在最後", async function () {
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "2尾");
  h.useJson({ reply_text: "好的。", draft_changes: { quantity: 2 }, next_action: "ask" });

  await h.reply(room.id, message.id, undefined, listingContext(draft({ photo_url: "" })));
  assert.deepEqual(h.calls[0].context.missing_fields, ["quantity", "photo_url", "price"]);
});
