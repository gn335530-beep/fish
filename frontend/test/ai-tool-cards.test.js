/* 工具結果卡片：CHAT 行情卡與 WEB 資料來源卡。 */

import test from "node:test";
import assert from "node:assert/strict";
import { USER_CITY, setupAiTest } from "./ai-fixtures.js";

let aiReply = null;

const ai = await setupAiTest({
  user: USER_CITY,
  handle: async function (path) {
    if (path === "/api/ai/reply") return { data: aiReply };
    throw new Error("unexpected path: " + path);
  }
});

const store = ai.store;
const flow = ai.flow;
const assistantView = await import("../assets/js/demo/views/assistant.js");

function marketToolResult() {
  return {
    found: true,
    species_code: 2201,
    species_name: "石斑魚",
    official_name: "石斑魚",
    scope: "city",
    region: "高雄市",
    trade_date: "2026-10-22",
    price_per_kg: 100,
    price_per_taijin: 60,
    is_aquaculture: false,
    source: "農業部漁產品交易行情",
    source_url: "https://example.com/market",
    fetched_at: "2026-10-22T00:00:00.000Z",
    quality: "official",
    history: []
  };
}

test.beforeEach(function () {
  ai.reset();
  aiReply = { handled: false };
});

test("CHAT 有行情工具結果時，文字後附既有行情卡", async function () {
  aiReply = {
    handled: true,
    intent: "CHAT",
    reply_text: "石斑魚今天有行情。",
    slots: {},
    sources: [],
    tool_results: {
      market: marketToolResult()
    }
  };

  await flow.submitText("石斑跟黑鯛哪個比較貴");
  const html = assistantView.renderAssistant();
  assert.match(html, /行情卡/);
  assert.match(html, /石斑魚/);
  assert.match(html, /60/);
});

test("CHAT 回答不產生資料來源卡", async function () {
  aiReply = {
    handled: true,
    intent: "CHAT",
    reply_text: "吳郭魚肉質細緻。",
    slots: {},
    sources: [],
    tool_results: {}
  };

  await flow.submitText("吳郭魚口感如何");
  const html = assistantView.renderAssistant();
  assert.doesNotMatch(html, /資料來源/);
});

test("WEB 回合有行情工具結果時仍附行情卡", async function () {
  aiReply = {
    handled: true,
    intent: "WEB",
    reply_text: "石斑魚今天有行情。",
    slots: {},
    sources: [{ title: "中央氣象署", url: "https://www.cwa.gov.tw/a" }],
    tool_results: { market: marketToolResult() }
  };

  await flow.submitText("今天天氣如何，順便說石斑");
  const html = assistantView.renderAssistant();
  assert.match(html, /行情卡/);
  assert.match(html, /資料來源/);
});

test("WEB 回覆寫入資料來源卡，最多三個連結", async function () {
  aiReply = {
    handled: true,
    intent: "WEB",
    reply_text: "今天多雲短暫雨。",
    slots: {},
    sources: [
      { title: "中央氣象署", url: "https://www.cwa.gov.tw/a" },
      { title: "惡意", url: "javascript:alert(1)" },
      { title: "新聞", url: "https://example.com/b" },
      { title: "第二新聞", url: "https://example.com/c" },
      { title: "多餘來源", url: "https://example.com/d" }
    ],
    tool_results: {}
  };

  await flow.submitText("今天天氣如何");
  const html = assistantView.renderAssistant();
  assert.match(html, /資料來源/);
  assert.match(html, /中央氣象署/);
  assert.doesNotMatch(html, /javascript:/);
  assert.doesNotMatch(html, /多餘來源/);
  assert.equal((html.match(/<a /g) || []).length, 3);
});
