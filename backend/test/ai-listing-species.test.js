/* listing 魚種解析：合法別名、候選、未知魚種、錯字修正、使用者確認字串與字典工具。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop } = require("./client");
const h = require("./ai-reply-helpers");
const { raw, seedCatalog, resetCatalog } = require("./market-catalog-helpers");

const ROWS = [
  raw({ "品種代碼": 2141, "魚貨名稱": "土魠" }),
  raw({ "品種代碼": 2201, "魚貨名稱": "石斑魚" }),
  raw({ "品種代碼": 2202, "魚貨名稱": "龍膽石斑" }),
  raw({ "品種代碼": 2101, "魚貨名稱": "鬼頭刀" })
];

function draft(overrides) {
  return Object.assign({
    client_request_id: "pub_x",
    fish_species: "",
    species_code: null,
    quantity: 2,
    condition: "放血冰鎮",
    photo_url: "/uploads/a.jpg",
    price: 3000,
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

test("合法別名保留原文，草稿帶入官方代碼", async function () {
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "土魠魚");
  h.useJson({
    reply_text: "好的，魚種是土魠魚。",
    draft_changes: { fish_species: "土魠魚" },
    next_action: "ask"
  });

  const result = await h.reply(room.id, message.id, undefined, listingContext(draft()));
  assert.equal(result.body.data.handled, true);
  const changes = result.body.data.listing.draft_changes;
  assert.equal(changes.fish_species, "土魠魚");
  assert.equal(changes.species_code, 2141);
});

test("多候選時不自動帶入代碼", async function () {
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "石斑");
  h.useJson({
    reply_text: "是哪一種？石斑魚、龍膽石斑",
    draft_changes: { fish_species: "石斑" },
    next_action: "ask"
  });

  const result = await h.reply(room.id, message.id, undefined, listingContext(draft()));
  const changes = result.body.data.listing.draft_changes;
  assert.equal(changes.fish_species, "石斑");
  assert.equal("species_code" in changes, false);
});

test("查無魚種時代碼留空", async function () {
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "外星魚");
  h.useJson({
    reply_text: "查不到這個魚種，仍要上架嗎？",
    draft_changes: { fish_species: "外星魚" },
    next_action: "ask"
  });

  const result = await h.reply(room.id, message.id, undefined, listingContext(draft()));
  const changes = result.body.data.listing.draft_changes;
  assert.equal(changes.fish_species, "外星魚");
  assert.equal("species_code" in changes, false);
});

test("原字串查無、修正後唯一候選時套用修正並記錄歷史", async function () {
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "鬼投刀");
  h.useJson({
    reply_text: "我把魚種「鬼投刀」修正為「鬼頭刀」。",
    corrections: [{ field: "fish_species", original: "鬼投刀", corrected: "鬼頭刀" }],
    draft_changes: { fish_species: "鬼投刀" },
    next_action: "ask"
  });

  const ctx = listingContext(draft({ fish_species: "鬼投刀" }));
  const result = await h.reply(room.id, message.id, undefined, ctx);
  const listing = result.body.data.listing;
  assert.equal(listing.draft_changes.fish_species, "鬼頭刀");
  assert.equal(listing.draft_changes.species_code, 2101);
  assert.equal(listing.corrections[0].field, "fish_species");
  assert.equal(listing.correction_history.length, 1);
  assert.ok(listing.correction_history[0].time);
});

test("合法別名、多候選或已有候選時的修正被後端拒絕", async function () {
  const room = await h.createRoom();
  const cases = [
    { text: "土魠魚", draft: draft({ fish_species: "土魠魚" }), corrected: "土魠" },
    { text: "石斑", draft: draft({ fish_species: "石斑" }), corrected: "石斑魚" }
  ];
  for (const item of cases) {
    const message = await h.sendUser(room.id, item.text);
    h.useJson({
      reply_text: "修正。",
      corrections: [{ field: "fish_species", original: item.draft.fish_species, corrected: item.corrected }],
      next_action: "ask"
    });
    const result = await h.reply(room.id, message.id, undefined, listingContext(item.draft));
    assert.equal(result.body.data.handled, false, item.text);
    assert.equal(result.body.data.error_code, "LLM_GUARD_REJECTED", item.text);
  }
});

test("使用者確認字串阻擋再次修正", async function () {
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "鬼投刀");
  h.useJson({
    reply_text: "修正。",
    corrections: [{ field: "fish_species", original: "鬼投刀", corrected: "鬼頭刀" }],
    next_action: "ask"
  });

  const ctx = listingContext(draft({ fish_species: "鬼投刀" }), { protected_names: ["鬼投刀"] });
  const result = await h.reply(room.id, message.id, undefined, ctx);
  assert.equal(result.body.data.handled, false);
  assert.equal(result.body.data.error_code, "LLM_GUARD_REJECTED");
});

test("保留我打的字時改回原值並加入使用者確認字串", async function () {
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "不是，保留我打的字");
  h.useJson({
    reply_text: "好，保留你打的字。",
    draft_changes: { fish_species: "鬼投刀" },
    protected_names: ["鬼投刀"],
    next_action: "ask"
  });

  const ctx = listingContext(draft({ fish_species: "鬼頭刀", species_code: 2101 }), {
    correction_history: [{ field: "fish_species", original: "鬼投刀", corrected: "鬼頭刀", time: "2026-11-01T00:00:00.000Z" }]
  });
  const result = await h.reply(room.id, message.id, undefined, ctx);
  const listing = result.body.data.listing;
  assert.equal(listing.draft_changes.fish_species, "鬼投刀");
  assert.deepEqual(listing.protected_names, ["鬼投刀"]);
  assert.equal(listing.correction_history.length, 1);
});

test("lookup_species 工具精確查詢並回代碼與別名", async function () {
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "石斑");
  h.useSequence([
    { tool_calls: [{ name: "lookup_species", args: { name: "石斑" }, id: "call_1" }] },
    {
      text: JSON.stringify({
        reply_text: "是哪一種？石斑魚、龍膽石斑",
        draft_changes: { fish_species: "石斑" },
        next_action: "ask"
      })
    }
  ]);

  const result = await h.reply(room.id, message.id, undefined, listingContext(draft()));
  assert.equal(result.body.data.handled, true);
  const toolResult = h.calls[1].tool_rounds[0].results[0].result;
  assert.deepEqual(toolResult.candidates.map(function (row) {
    return row.official_name;
  }), ["石斑魚", "龍膽石斑"]);
});
