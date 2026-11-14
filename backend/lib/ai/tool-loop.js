/* 工具執行迴圈：呼叫 provider；模型要求工具時執行後再呼叫，一次回覆最多 2 次工具呼叫。 */

const provider = require("./provider");
const tools = require("./tools");
const { llmError } = require("./error");
const { mapError } = require("./result");

const DEFAULT_MAX_TOOL_CALLS = 2;

function collectUsage(usage, raw) {
  const step = provider.tokenCounts(raw && raw.usage);
  usage.input += step.input;
  usage.output += step.output;
  usage.total += step.total;
}

async function runTool(call, ctx, report) {
  const started = Date.now();
  try {
    const result = await tools.execute(call.name, call.args, ctx);
    if (call.name === "get_market_price" && result && result.found === false &&
      result.reason === "UPSTREAM_UNAVAILABLE") {
      throw llmError("LLM_UPSTREAM_ERROR");
    }
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

function toolCallLimit(options) {
  const limit = Number(options.maxToolCalls);
  return Number.isInteger(limit) && limit > 0 ? limit : DEFAULT_MAX_TOOL_CALLS;
}

/* report 由 service 建立，成功或失敗都拿得到工具紀錄與 token 數供 log 使用。 */
async function run(input, options, report) {
  const maxToolCalls = toolCallLimit(options);
  const toolTurns = [];
  const toolResults = {};
  let webResults = [];
  const startedAt = Date.now();
  let deadline = startedAt + options.timeoutMs;
  let productRegion = null;
  let finalRaw = null;

  for (let round = 0; round <= maxToolCalls; round++) {
    const raw = await provider.generate(Object.assign({}, input, {
      timeoutMs: Math.max(1, deadline - Date.now()),
      tools: options.toolDefs,
      tool_turns: toolTurns
    }));
    collectUsage(report.usage, raw);
    const calls = raw && raw.tool_calls ? raw.tool_calls : [];
    if (!Array.isArray(calls)) throw llmError("LLM_GUARD_REJECTED");
    if (!calls.length) {
      finalRaw = raw;
      break;
    }

    const remaining = maxToolCalls - report.toolRuns.length;
    if (remaining <= 0) throw llmError("LLM_GUARD_REJECTED");
    for (const call of calls.slice(0, remaining)) {
      const runStarted = Date.now();
      if (call.name === "web_search") {
        deadline = Math.max(deadline, startedAt + options.searchTimeoutMs);
      }
      const ctx = Object.assign({}, options.toolCtx, {
        timeoutMs: Math.max(1, deadline - runStarted)
      });
      const result = await runTool(call, ctx, report);
      toolTurns.push({ name: call.name, args: call.args || {}, result: result });
      if (call.name === "get_market_price") toolResults.market = result;
      if (call.name === "search_products") {
        toolResults.products = result.products || [];
        productRegion = result.region || null;
      }
      if (call.name === "web_search") webResults = result.results || [];
    }
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
