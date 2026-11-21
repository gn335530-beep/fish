/* 模型驅動上架的魚種與處理方式契約：代碼、修正歷史、確認字串與縮短提議。 */

import test from "node:test";
import assert from "node:assert/strict";
import { setupAiTest } from "./ai-fixtures.js";

let aiReply = null;

const ai = await setupAiTest({
  handle: async function (path) {
    if (path === "/api/ai/reply") return { data: aiReply };
    throw new Error("unexpected path: " + path);
  }
});

const store = ai.store;
const flow = ai.flow;

function listingContext(draft, extra) {
  return Object.assign({ mode: "listing", draft: draft, last_cards: [] }, extra || {});
}

function reply(overrides) {
  return {
    handled: true,
    intent: "SELL",
    slots: {},
    listing: Object.assign({
      reply_text: null,
      corrections: [],
      draft_changes: {},
      correction_history: [],
      protected_names: [],
      condition_proposal: null,
      next_action: "ask"
    }, overrides || {}),
    reply_text: null,
    sources: [],
    tool_results: {}
  };
}

const DRAFT = {
  fish_species: "",
  species_code: null,
  quantity: 2,
  condition: "放血冰鎮",
  photo_url: "/uploads/a.jpg",
  price: 3000,
  price_per_taijin: null
};

test.beforeEach(function () {
  ai.reset();
  aiReply = { handled: false };
});

test("套用魚種與官方代碼，商品名稱仍用原文", async function () {
  aiReply = reply({
    reply_text: "好的，魚種是土魠魚。",
    draft_changes: { fish_species: "土魠魚", species_code: 2141 }
  });
  store.update({ room: { id: "conv_1", type: "assistant", context: listingContext(DRAFT) } });

  await flow.submitText("土魠魚");

  const draft = store.state.room.context.draft;
  assert.equal(draft.fish_species, "土魠魚");
  assert.equal(draft.species_code, 2141);
});

test("魚種改變時行情快取失效", async function () {
  aiReply = reply({
    reply_text: "好的。",
    draft_changes: { fish_species: "鬼頭刀", species_code: 2101 }
  });
  store.update({
    room: { id: "conv_1", type: "assistant", context: listingContext(DRAFT, { market_quoted: true }) }
  });

  await flow.submitText("鬼頭刀");

  assert.equal(store.state.room.context.market_quoted, false);
});

test("修正歷史與使用者確認字串寫進 context", async function () {
  aiReply = reply({
    reply_text: "我把魚種「鬼投刀」修正為「鬼頭刀」。",
    corrections: [{ field: "fish_species", original: "鬼投刀", corrected: "鬼頭刀" }],
    draft_changes: { fish_species: "鬼頭刀", species_code: 2101 },
    correction_history: [
      { field: "fish_species", original: "鬼投刀", corrected: "鬼頭刀", time: "2026-11-01T00:00:00.000Z" }
    ],
    protected_names: ["鬼投刀"]
  });
  store.update({
    room: {
      id: "conv_1",
      type: "assistant",
      context: listingContext(Object.assign({}, DRAFT, { fish_species: "鬼投刀" }))
    }
  });

  await flow.submitText("鬼投刀");

  const ctx = store.state.room.context;
  assert.equal(ctx.draft.fish_species, "鬼頭刀");
  assert.equal(ctx.correction_history.length, 1);
  assert.deepEqual(ctx.protected_names, ["鬼投刀"]);
});

test("處理方式縮短提議寫進 context，草稿不變", async function () {
  aiReply = reply({
    reply_text: "要不要改成「放血冰鎮去鰓」？",
    condition_proposal: "放血冰鎮去鰓"
  });
  store.update({ room: { id: "conv_1", type: "assistant", context: listingContext(DRAFT) } });

  await flow.submitText("放血冰鎮然後去鰓");

  assert.equal(store.state.room.context.condition_proposal, "放血冰鎮去鰓");
  assert.equal(store.state.room.context.draft.condition, "放血冰鎮");
});

test("釣客保留原字串時改回原值並清掉代碼，歷史仍保留", async function () {
  aiReply = reply({
    reply_text: "好，保留你打的字。",
    draft_changes: { fish_species: "鬼投刀" },
    protected_names: ["鬼投刀"],
    correction_history: [
      { field: "fish_species", original: "鬼投刀", corrected: "鬼頭刀", time: "2026-11-01T00:00:00.000Z" }
    ]
  });
  store.update({
    room: {
      id: "conv_1",
      type: "assistant",
      context: listingContext(Object.assign({}, DRAFT, { fish_species: "鬼頭刀", species_code: 2101 }))
    }
  });

  await flow.submitText("不是，保留我打的字");

  const ctx = store.state.room.context;
  assert.equal(ctx.draft.fish_species, "鬼投刀");
  assert.equal(ctx.draft.species_code, null);
  assert.deepEqual(ctx.protected_names, ["鬼投刀"]);
  assert.equal(ctx.correction_history.length, 1);
});
