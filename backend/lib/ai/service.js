/* AI 回覆流程：開關、歷史摘要、工具迴圈、輸出驗證、錯誤映射與 metadata log。 */

const { llmConfig } = require("./config");
const provider = require("./provider");
const { SYSTEM_PROMPT } = require("./prompt");
const { historyFor, contextSummary } = require("./history");
const { parseOutput, normalizeOutput } = require("./validate");
const tools = require("./tools");
const { logReply } = require("./log");
const { failure, guardError, upstreamError, mapError, sourcesOf } = require("./result");

async function reply(options) {
  const started = Date.now();
  const config = llmConfig();
  const baseLog = {
    request_id: options.requestId,
    user_id: options.user && options.user.id,
    conversation_id: options.conversation.id
  };
  const toolRuns = [];

  if (!config.enabled) {
    logReply(Object.assign({}, baseLog, { duration_ms: Date.now() - started, error_code: "LLM_DISABLED" }));
    return failure("LLM_DISABLED", false);
  }
  if (!config.apiKey) {
    logReply(Object.assign({}, baseLog, {
      duration_ms: Date.now() - started, error_code: "LLM_NOT_CONFIGURED"
    }));
    return failure("LLM_NOT_CONFIGURED", false);
  }

  const webEnabled = config.webSearch && Boolean(config.tavilyApiKey);
  const toolDefs = tools.definitions({ webEnabled: webEnabled });
  const toolCtx = {
    user: options.user,
    webEnabled: webEnabled,
    tavilyApiKey: config.tavilyApiKey,
    timeoutMs: config.searchTimeoutMs
  };
  const input = {
    model: config.model,
    timeoutMs: config.timeoutMs,
    system: SYSTEM_PROMPT,
    context: contextSummary(options.context),
    messages: historyFor(options.conversation.id, config.historyLimit)
  };

  const toolTurns = [];
  const toolResults = {};
  let webResults = [];
  let webUsed = false;
  let productRegion = null;
  let intent = null;
  const usage = { input: 0, output: 0, total: 0 };
  const startedAt = Date.now();
  let deadline = startedAt + config.timeoutMs;

  try {
    let finalRaw = null;
    for (let round = 0; round <= config.maxToolCalls; round++) {
      const raw = await provider.generate(Object.assign({}, input, {
        timeoutMs: Math.max(1, deadline - Date.now()),
        tools: toolDefs,
        tool_turns: toolTurns
      }));
      const stepUsage = provider.tokenCounts(raw && raw.usage);
      usage.input += stepUsage.input;
      usage.output += stepUsage.output;
      usage.total += stepUsage.total;
      const calls = raw && raw.tool_calls ? raw.tool_calls : [];
      if (!Array.isArray(calls)) throw guardError();
      if (!calls.length) {
        finalRaw = raw;
        break;
      }

      const remaining = config.maxToolCalls - toolRuns.length;
      if (remaining <= 0) throw guardError();
      const batch = calls.slice(0, remaining);
      for (const call of batch) {
        const runStarted = Date.now();
        if (call.name === "web_search") {
          deadline = Math.max(deadline, startedAt + config.searchTimeoutMs);
        }
        toolCtx.timeoutMs = Math.max(1, deadline - runStarted);
        try {
          const result = await tools.execute(call.name, call.args, toolCtx);
          if (call.name === "get_market_price" && result && result.found === false &&
            result.reason === "UPSTREAM_UNAVAILABLE") {
            throw upstreamError();
          }
          toolRuns.push({ name: call.name, duration_ms: Date.now() - runStarted, error_code: null });
          toolTurns.push({ name: call.name, args: call.args || {}, result: result });
          if (call.name === "get_market_price") toolResults.market = result;
          if (call.name === "search_products") {
            toolResults.products = result.products || [];
            productRegion = result.region || null;
          }
          if (call.name === "web_search") {
            webResults = result.results || [];
            webUsed = true;
          }
        } catch (error) {
          toolRuns.push({
            name: call.name,
            duration_ms: Date.now() - runStarted,
            error_code: mapError(error).code
          });
          throw error;
        }
      }
      if (calls.length > remaining) throw guardError();
    }
    if (!finalRaw) throw guardError();

    const parsed = parseOutput(finalRaw.text);
    intent = parsed.intent;
    const scope = productRegion || "全省";
    const suffix = intent === "PRODUCT_RECOMMEND" && parsed.reply_text &&
      String(parsed.reply_text).indexOf(scope) === -1
      ? "（查詢範圍：" + scope + "）"
      : "";
    const output = normalizeOutput(parsed, {
      userText: options.message.text,
      toolResults: toolResults,
      toolNames: toolRuns.filter(function (run) { return !run.error_code; })
        .map(function (run) { return run.name; }),
      webResults: webResults,
      sources: webResults.length ? sourcesOf(webResults) : [],
      replySuffix: suffix
    });

    if (intent === "PRODUCT_RECOMMEND" &&
      (!Array.isArray(toolResults.products) || !toolResults.products.length)) {
      throw guardError();
    }
    if (toolResults.market && toolResults.market.found === false &&
      /\d/.test(output.reply_text || "")) {
      throw guardError();
    }
    if (intent === "WEB" && !webResults.length) throw guardError();

    logReply(Object.assign({}, baseLog, {
      intent: output.intent,
      tokens: usage,
      duration_ms: Date.now() - started,
      error_code: null,
      tools: toolRuns
    }));
    return Object.assign({ handled: true }, output, { error_code: null, retryable: false });
  } catch (error) {
    const mapped = mapError(error);
    logReply(Object.assign({}, baseLog, {
      intent: intent,
      tokens: usage,
      duration_ms: Date.now() - started,
      error_code: mapped.code,
      tools: toolRuns
    }));
    return failure(mapped.code, mapped.retryable);
  }
}

module.exports = { reply: reply };
