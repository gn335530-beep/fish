/* Gemini 3 工具回合：保留 thoughtSignature／id，平行呼叫先全部呼叫再全部回應。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const provider = require("../lib/ai/provider");

test("tokenCounts 支援 Gemini 原始與正規化用量", function () {
  assert.deepEqual(provider.tokenCounts({
    promptTokenCount: 12,
    candidatesTokenCount: 8,
    totalTokenCount: 20
  }), { input: 12, output: 8, total: 20 });
  assert.deepEqual(provider.tokenCounts({
    prompt_tokens: 12,
    completion_tokens: 8
  }), { input: 12, output: 8, total: 20 });
  assert.deepEqual(provider.tokenCounts({
    input: 12,
    output: 8,
    total: 20
  }), { input: 12, output: 8, total: 20 });
  assert.deepEqual(provider.tokenCounts(null), { input: 0, output: 0, total: 0 });
});

function fakeFetch(handler) {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  return function () { globalThis.fetch = original; };
}

test("工具回合保留 thoughtSignature 與 id，且先呼叫再回應", async function () {
  process.env.GEMINI_API_KEY = "test-key";
  let captured = null;
  let capturedUrl = "";
  let capturedHeaders = null;
  const restore = fakeFetch(async function (url, options) {
    captured = JSON.parse(options.body);
    capturedUrl = url;
    capturedHeaders = options.headers;
    return {
      ok: true,
      status: 200,
      json: async function () {
        return {
          candidates: [{ content: { parts: [{ text: "{}" }] } }],
          usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 }
        };
      }
    };
  });
  try {
    const result = await provider.generate({
      model: "test-model",
      timeoutMs: 1000,
      system: "system",
      context: {},
      messages: [{ role: "user", text: "hi" }],
      tool_rounds: [{
        calls: [
          { name: "web_search", args: { query: "x" }, id: "call_1", thoughtSignature: "sig" },
          { name: "search_products", args: { species: "石斑" }, id: "call_2" }
        ],
        results: [
          { name: "web_search", id: "call_1", result: { results: [] } },
          { name: "search_products", id: "call_2", result: { products: [] } }
        ]
      }],
      tools: [{ name: "web_search", parameters: { type: "OBJECT", properties: {} } }],
      toolConfig: { functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["web_search"] } }
    });

    assert.equal(result.text, "{}");
    assert.equal(capturedUrl.indexOf("key="), -1);
    assert.equal(capturedHeaders["x-goog-api-key"], "test-key");
    assert.equal(captured.contents.length, 3);
    assert.equal(captured.contents[1].role, "model");
    assert.equal(captured.contents[1].parts.length, 2);
    assert.equal(captured.contents[1].parts[0].functionCall.id, "call_1");
    assert.equal(captured.contents[1].parts[0].thoughtSignature, "sig");
    assert.equal(captured.contents[1].parts[1].functionCall.id, "call_2");
    assert.equal(captured.contents[1].parts[1].thoughtSignature, undefined);
    assert.equal(captured.contents[2].role, "user");
    assert.equal(captured.contents[2].parts.length, 2);
    assert.equal(captured.contents[2].parts[0].functionResponse.id, "call_1");
    assert.equal(captured.contents[2].parts[1].functionResponse.id, "call_2");
    assert.deepEqual(captured.toolConfig, {
      functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["web_search"] }
    });
  } finally {
    restore();
  }
});
