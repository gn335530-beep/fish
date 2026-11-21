/* 模型驅動上架流程：草稿變更持久化、基本模式切換與草稿卡按鈕。 */

import test from "node:test";
import assert from "node:assert/strict";
import { IDLE, setupAiTest } from "./ai-fixtures.js";

let aiReply = null;
let notifyError = null;

const ai = await setupAiTest({
  handle: async function (path) {
    if (path === "/api/ai/reply") {
      if (aiReply instanceof Error) throw aiReply;
      return { data: aiReply };
    }
    throw new Error("unexpected path: " + path);
  },
  notify: function (error) { notifyError = error; }
});

const store = ai.store;
const flow = ai.flow;
const assistantTexts = ai.assistantTexts;
const assistantView = await import("../assets/js/demo/views/assistant.js");
const { renderCard } = await import("../assets/js/demo/views/cards.js");

const DRAFT = {
  fish_species: "鬼頭刀",
  species_code: 1234,
  quantity: 2,
  condition: "放血冰鎮",
  photo_url: "/uploads/a.jpg",
  price: null,
  price_per_taijin: null
};

function listingContext(draft, extra) {
  return Object.assign({ mode: "listing", draft: draft, last_cards: [] }, extra || {});
}

function listingReply(overrides) {
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

test.beforeEach(function () {
  ai.reset();
  aiReply = { handled: false };
  notifyError = null;
});

test("模型回傳草稿變更時，草稿更新並寫進 room.context", async function () {
  aiReply = listingReply({
    reply_text: "好的，已更新為 3 尾。",
    draft_changes: { quantity: 3 }
  });
  store.update({ room: { id: "conv_1", type: "assistant", context: listingContext(DRAFT) } });

  await flow.submitText("3尾");

  assert.equal(store.state.room.context.draft.quantity, 3);
  assert.deepEqual(assistantTexts(), ["好的，已更新為 3 尾。"]);
});

test("模型逾時時切換基本模式並顯示一次提示", async function () {
  aiReply = { handled: false, error_code: "LLM_TIMEOUT", retryable: false };
  store.update({
    room: { id: "conv_1", type: "assistant", context: listingContext(Object.assign({}, DRAFT, { quantity: null })) }
  });

  await flow.submitText("3尾");

  assert.equal(store.state.room.context.basic_mode, true);
  assert.match(assistantTexts()[0], /已切換基本模式/);
});

test("429 同樣切換基本模式，不顯示重試", async function () {
  aiReply = { handled: false, error_code: "LLM_RATE_LIMITED", retryable: true };
  store.update({ room: { id: "conv_1", type: "assistant", context: listingContext(DRAFT) } });

  await flow.submitText("3尾");

  assert.equal(store.state.room.context.basic_mode, true);
  assert.match(assistantTexts()[0], /已切換基本模式/);
  assert.equal(store.state.aiRetry, null);
});

test("LLM_DISABLED 不切換基本模式，也不顯示提示", async function () {
  aiReply = { handled: false, error_code: "LLM_DISABLED", retryable: false };
  store.update({
    room: { id: "conv_1", type: "assistant", context: listingContext(Object.assign({}, DRAFT, { quantity: null })) }
  });

  await flow.submitText("3尾");

  assert.notEqual(store.state.room.context.basic_mode, true);
  assert.equal(assistantTexts().some(function (text) { return /已切換基本模式/.test(text); }), false);
});

test("驗證失敗（LLM_GUARD_REJECTED）只丟棄該輪，不切換基本模式", async function () {
  aiReply = { handled: false, error_code: "LLM_GUARD_REJECTED", retryable: false };
  store.update({ room: { id: "conv_1", type: "assistant", context: listingContext(DRAFT) } });

  await flow.submitText("3尾");

  assert.notEqual(store.state.room.context.basic_mode, true);
  assert.equal(assistantTexts().some(function (text) { return /已切換基本模式/.test(text); }), false);
});

test("基本模式維持到開新房間：同一房後續訊息仍走規則", async function () {
  aiReply = { handled: false, error_code: "LLM_TIMEOUT", retryable: false };
  const draft = Object.assign({}, DRAFT, { quantity: null });
  store.update({ room: { id: "conv_1", type: "assistant", context: listingContext(draft) } });

  await flow.submitText("3尾");
  assert.equal(store.state.room.context.basic_mode, true);

  aiReply = listingReply({ reply_text: "好的。", draft_changes: { quantity: 5 } });
  await flow.submitText("5尾");

  /* 基本模式下模型結果被忽略，改由規則引擎處理。 */
  assert.notEqual(store.state.room.context.draft.quantity, null);
  assert.equal(assistantTexts().filter(function (text) { return /已切換基本模式/.test(text); }).length, 1);
});

test("模型要求顯示草稿卡時，草稿卡沒有「修改草稿」", async function () {
  aiReply = listingReply({
    reply_text: "資料都齊了，請確認內容後按「確認上架」。",
    draft_changes: { price: 3000 },
    next_action: "show_draft_card"
  });
  store.update({ room: { id: "conv_1", type: "assistant", context: listingContext(DRAFT) } });

  await flow.submitText("整批3000");

  const html = assistantView.renderAssistant();
  assert.match(html, /確認上架/);
  assert.match(html, /取消上架/);
  assert.doesNotMatch(html, /修改草稿/);
});

test("草稿卡渲染：規則/基本模式有「修改草稿」，模型模式沒有", function () {
  const draft = {
    fish_species: "花枝", quantity: 2, condition: "放血冰鎮",
    photo_url: "/uploads/a.jpg", price: 1000, price_per_taijin: 200
  };
  assert.match(renderCard({ type: "draft", draft: draft }, "msg_1"), /修改草稿/);
  assert.doesNotMatch(renderCard({ type: "draft", draft: draft, hide_edit: true }, "msg_1"), /修改草稿/);
});

test("交易房不呼叫 AI 端點", async function () {
  store.update({ room: { id: "conv_deal", type: "deal", context: null } });
  await flow.submitText("你好");
  assert.equal(ai.aiPaths().length, 0);
});
