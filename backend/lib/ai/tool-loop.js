/* 工具執行迴圈：呼叫 provider；模型要求工具時執行後再呼叫，一次回覆最多 2 次工具呼叫。 */

const provider = require("./provider");
const tools = require("./tools");
const { llmError } = require("./error");
const { mapError } = require("./result");

const MAX_TOOL_CALLS = 2;

function collectUsage(usage, raw) {
  const step = provider.tokenCounts(raw && raw.usage);
  usage.input += step.input;
  usage.output += step.output;
  usage.total += step.total;
}

function toolFailure(result) {
  if (!result || result.found !== false) return null;
  if (result.reason === "UPSTREAM_TIMEOUT") return llmError("LLM_TIMEOUT");
  if (result.reason === "UPSTREAM_UNAVAILABLE") return llmError("LLM_UPSTREAM_ERROR");
  return null;
}

async function runTool(call, ctx, report) {
  const started = Date.now();
  try {
    const result = await tools.execute(call.name, call.args, ctx);
    const failureError = toolFailure(result);
    if (failureError) throw failureError;
    report.toolRuns.push({ name: call.name, duration_ms: Date.now() - started, error_code: null });
    return result;
  } catch (error) {
    report.toolRuns.push({
      name: call.name,
      duration_ms: Date.now() - started,
      error_code: mapError(error).code
    });
    throw error;
  }
}

/* report 由 service 建立，成功或失敗都拿得到工具紀錄與 token 數供 log 使用。 */
async function run(input, options, report) {
  const toolRounds = [];
  const toolResults = {};
  let webResults = [];
  const startedAt = Date.now();
  let deadline = startedAt + options.timeoutMs;
  let productRegion = null;
  let finalRaw = null;

  for (let round = 0; round <= MAX_TOOL_CALLS; round++) {
    if (Date.now() >= deadline) throw llmError("LLM_TIMEOUT");
    /* 強制工具只用在第一輪；工具結果回來後讓模型自由輸出 JSON。 */
    const toolConfig = !toolRounds.length && options.forceTool
      ? { functionCallingConfig: { mode: "ANY", allowedFunctionNames: [options.forceTool] } }
      : undefined;
    const raw = await provider.generate(Object.assign({}, input, {
      timeoutMs: Math.max(1, deadline - Date.now()),
      tools: options.toolDefs,
      tool_rounds: toolRounds,
      toolConfig: toolConfig
    }));
    collectUsage(report.usage, raw);
    if (Date.now() > deadline) throw llmError("LLM_TIMEOUT");
    const calls = raw && raw.tool_calls ? raw.tool_calls : [];
    if (!Array.isArray(calls)) throw llmError("LLM_GUARD_REJECTED");
    if (!calls.length) {
      finalRaw = raw;
      break;
    }

    const remaining = MAX_TOOL_CALLS - report.toolRuns.length;
    if (remaining <= 0) throw llmError("LLM_GUARD_REJECTED");
    const roundCalls = calls.slice(0, remaining);
    const roundResults = [];
    for (const call of roundCalls) {
      const runStarted = Date.now();
      if (call.name === "web_search") {
        deadline = Math.max(deadline, startedAt + options.searchTimeoutMs);
      }
      const remainingMs = deadline - runStarted;
      if (remainingMs <= 0) throw llmError("LLM_TIMEOUT");
      const ctx = Object.assign({}, options.toolCtx, { timeoutMs: remainingMs });
      const result = await runTool(call, ctx, report);
      roundResults.push({
        name: call.name,
        id: call.id,
        result: tools.modelResult(call.name, result)
      });
      if (call.name === "get_market_price") toolResults.market = result;
      if (call.name === "search_products") {
        toolResults.products = result.products || [];
        productRegion = result.region || null;
      }
      if (call.name === "web_search") {
        webResults = webResults.concat(result.results || []);
      }
    }
    toolRounds.push({
      calls: roundCalls.map(function (call) {
        return {
          name: call.name,
          args: call.args || {},
          id: call.id,
          thoughtSignature: call.thoughtSignature
        };
      }),
      results: roundResults
    });
    if (calls.length > remaining) throw llmError("LLM_GUARD_REJECTED");
  }
  if (!finalRaw) throw llmError("LLM_GUARD_REJECTED");

  return {
    raw: finalRaw,
    toolResults: toolResults,
    webResults: webResults,
    productRegion: productRegion
  };
}

module.exports = { run: run };
