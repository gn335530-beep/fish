/* listing 處理方式：長度、數字單位、編輯距離、縮短提議與同意後套用。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop } = require("./client");
const h = require("./ai-reply-helpers");

const LONG_CONDITION = "放血冰鎮然後去鰓去鱗去內臟再真空包裝並且低溫冷藏保存";
const PROPOSAL = "放血冰鎮去鰓";

function draft(overrides) {
  return Object.assign({
    client_request_id: "pub_x",
    fish_species: "鬼頭刀",
    species_code: 2101,
    quantity: 2,
    condition: "",
    photo_url: "/uploads/a.jpg",
    price: 3000,
    price_per_taijin: null
  }, overrides || {});
}

function listingContext(draftValue, overrides) {
  return Object.assign({ mode: "listing", draft: draftValue, last_cards: [] }, overrides || {});
}

async function ask(text, reply, ctx) {
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, text);
  h.useJson(reply);
  return h.reply(room.id, message.id, undefined, ctx);
}

test.before(start);
test.after(stop);
test.beforeEach(function () {
  h.reset({ LLM_ENABLED: "true", GEMINI_API_KEY: "test-key" });
});

test("合法的處理方式變更直接套用", async function () {
  const result = await ask("活體", {
    reply_text: "好的，處理方式是活體。",
    draft_changes: { condition: "活體" },
    next_action: "ask"
  }, listingContext(draft()));
  assert.equal(result.body.data.handled, true);
  assert.equal(result.body.data.listing.draft_changes.condition, "活體");
});

test("處理方式超過 20 字時丟棄該變更", async function () {
  const result = await ask("放血冰鎮然後去鰓去鱗去內臟再真空包裝並且低溫冷藏保存", {
    reply_text: "目前 26 字，請縮短到 20 字以內。",
    draft_changes: { condition: LONG_CONDITION },
    next_action: "ask"
  }, listingContext(draft()));
  assert.equal(result.body.data.handled, false);
  assert.equal(result.body.data.error_code, "LLM_GUARD_REJECTED");
});

test("只有數字與單位的處理方式被丟棄", async function () {
  const result = await ask("3公斤", {
    reply_text: "請描述處理方式。",
    draft_changes: { condition: "3公斤" },
    next_action: "ask"
  }, listingContext(draft()));
  assert.equal(result.body.data.handled, false);
  assert.equal(result.body.data.error_code, "LLM_GUARD_REJECTED");
});

test("編輯距離 2 以內的處理方式錯字被套用", async function () {
  const result = await ask("放血冰陣", {
    reply_text: "我把處理方式「放血冰陣」修正為「放血冰鎮」。",
    corrections: [{ field: "condition", original: "放血冰陣", corrected: "放血冰鎮" }],
    next_action: "ask"
  }, listingContext(draft({ condition: "放血冰陣" })));
  assert.equal(result.body.data.handled, true);
  assert.equal(result.body.data.listing.draft_changes.condition, "放血冰鎮");
});

test("編輯距離超過 2 的處理方式改寫被丟棄", async function () {
  const result = await ask("放血冰鎮", {
    reply_text: "修正。",
    corrections: [{ field: "condition", original: "放血冰鎮", corrected: "活體去內臟真空包裝" }],
    next_action: "ask"
  }, listingContext(draft({ condition: "放血冰鎮" })));
  assert.equal(result.body.data.handled, false);
  assert.equal(result.body.data.error_code, "LLM_GUARD_REJECTED");
});

test("處理方式縮短提議存入 contract 但不改草稿", async function () {
  const result = await ask("放血冰鎮然後去鰓", {
    reply_text: "要不要改成「放血冰鎮去鰓」？",
    condition_proposal: PROPOSAL,
    next_action: "ask"
  }, listingContext(draft(), { condition_ask_count: 2 }));
  const listing = result.body.data.listing;
  assert.equal(listing.condition_proposal, PROPOSAL);
  assert.equal("condition" in listing.draft_changes, false);
});

test("未同意就套用縮短版會被丟棄", async function () {
  const result = await ask("不要", {
    reply_text: "已更新處理方式。",
    draft_changes: { condition: PROPOSAL },
    next_action: "ask"
  }, listingContext(draft(), { condition_proposal: PROPOSAL }));
  assert.equal(result.body.data.handled, false);
  assert.equal(result.body.data.error_code, "LLM_GUARD_REJECTED");
});

test("釣客說好之後才套用縮短版並清掉提議", async function () {
  const result = await ask("好", {
    reply_text: "好，已更新處理方式。",
    draft_changes: { condition: PROPOSAL },
    next_action: "ask"
  }, listingContext(draft(), { condition_proposal: PROPOSAL }));
  assert.equal(result.body.data.handled, true);
  assert.equal(result.body.data.listing.draft_changes.condition, PROPOSAL);
  assert.equal(result.body.data.listing.condition_proposal, null);
});

test("處理方式回問訊號遞增回問計數", async function () {
  const result = await ask("放血冰鎮然後去鰓去鱗去內臟再真空包裝並且低溫冷藏保存", {
    reply_text: "目前 26 字，請縮短到 20 字以內。",
    condition_ask: true,
    next_action: "ask"
  }, listingContext(draft()));
  assert.equal(result.body.data.handled, true);
  assert.equal(result.body.data.listing.condition_ask_count, 1);
});

test("回問未滿兩次時提議縮短版被丟棄", async function () {
  const result = await ask("放血冰鎮然後去鰓", {
    reply_text: "要不要改成「放血冰鎮去鰓」？",
    condition_proposal: PROPOSAL,
    next_action: "ask"
  }, listingContext(draft()));
  assert.equal(result.body.data.handled, true);
  assert.equal(result.body.data.listing.condition_proposal, null);
});

test("回問滿兩次後提議縮短版被接受", async function () {
  const result = await ask("放血冰鎮然後去鰓", {
    reply_text: "要不要改成「放血冰鎮去鰓」？",
    condition_proposal: PROPOSAL,
    next_action: "ask"
  }, listingContext(draft(), { condition_ask_count: 2 }));
  assert.equal(result.body.data.listing.condition_proposal, PROPOSAL);
  assert.equal(result.body.data.listing.condition_ask_count, 2);
});

test("處理方式寫入有效值後回問計數歸零", async function () {
  const result = await ask("活體", {
    reply_text: "好的，處理方式是活體。",
    draft_changes: { condition: "活體" },
    next_action: "ask"
  }, listingContext(draft(), { condition_ask_count: 3 }));
  assert.equal(result.body.data.listing.condition_ask_count, 0);
});
