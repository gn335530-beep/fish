/* AI 回覆流程：開關、設定、歷史、輸出驗證、log 與錯誤映射；工具迴圈見 tool-loop。 */

const { llmConfig } = require("./config");
const { SYSTEM_PROMPT } = require("./prompt");
const { forceToolFor } = require("./classify");
const { historyFor, contextSummary } = require("./history");
const { parseOutput, normalizeOutput, finalIntent } = require("./validate");
const tools = require("./tools");
const toolLoop = require("./tool-loop");
const { logReply } = require("./log");
const { failure, mapError, sourcesOf } = require("./result");
const { llmError } = require("./error");

const NO_PRODUCTS_TEXT = "目前沒有符合條件的商品，可以換個魚種、地區或預算再試。";

function replySuffix(intent, replyText, scope) {
  return intent === "PRODUCT_RECOMMEND" && replyText &&
    String(replyText).indexOf(scope) === -1
    ? "（查詢範圍：" + scope + "）"
    : "";
}

async function reply(options) {
  const started = Date.now();
  const config = llmConfig();
  const baseLog = {
    request_id: options.requestId,
    user_id: options.user && options.user.id,
    conversation_id: options.conversation.id
  };
  const report = { toolRuns: [], usage: { input: 0, output: 0, total: 0 } };
  let intent = null;

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
  const forceTool = forceToolFor(options.message.text, { webEnabled: webEnabled });
  const input = {
    model: config.model,
    timeoutMs: config.timeoutMs,
    system: SYSTEM_PROMPT,
    context: contextSummary(options.context),
    messages: historyFor(options.conversation.id, options.message)
  };

  try {
    const loop = await toolLoop.run(input, {
      timeoutMs: config.timeoutMs,
      searchTimeoutMs: config.searchTimeoutMs,
      toolDefs: tools.definitions({ webEnabled: webEnabled }),
      forceTool: forceTool,
      toolCtx: {
        user: options.user,
        webEnabled: webEnabled,
        tavilyApiKey: config.tavilyApiKey
      }
    }, report);

    const parsed = parseOutput(loop.raw.text);
    const productToolUsed = report.toolRuns.some(function (run) {
      return run.name === "search_products" && !run.error_code;
    });
    if (parsed.intent === "PRODUCT_RECOMMEND" && !productToolUsed) {
      throw llmError("LLM_GUARD_REJECTED");
    }
    const products = Array.isArray(loop.toolResults.products) ? loop.toolResults.products : [];
    if (parsed.intent === "PRODUCT_RECOMMEND" && productToolUsed && !products.length) {
      /* 有查商品但沒有符合結果：回文字，不進商品推薦卡流程。 */
      parsed.intent = "CHAT";
      parsed.reply_text = NO_PRODUCTS_TEXT;
    }

    intent = finalIntent(parsed.intent, loop.webResults);
    const scope = loop.productRegion || "全省";
    const output = normalizeOutput(Object.assign({}, parsed, { intent: intent }), {
      userText: options.message.text,
      toolResults: loop.toolResults,
      toolNames: report.toolRuns.filter(function (run) { return !run.error_code; })
        .map(function (run) { return run.name; }),
      webResults: loop.webResults,
      sources: loop.webResults.length ? sourcesOf(loop.webResults) : [],
      replySuffix: replySuffix(intent, parsed.reply_text, scope)
    });
    if (loop.toolResults.market && loop.toolResults.market.found === false) {
      const text = output.reply_text || "";
      if (text && (/\d/.test(text) || text.indexOf("暫無行情") === -1)) {
        throw llmError("LLM_GUARD_REJECTED");
      }
    }
    if (intent === "WEB" && !loop.webResults.length) throw llmError("LLM_GUARD_REJECTED");

    logReply(Object.assign({}, baseLog, {
      intent: output.intent,
      tokens: report.usage,
      duration_ms: Date.now() - started,
      error_code: null,
      tools: report.toolRuns
    }));
    return Object.assign({ handled: true }, output, { error_code: null, retryable: false });
  } catch (error) {
    const mapped = mapError(error);
    logReply(Object.assign({}, baseLog, {
      intent: intent,
      tokens: report.usage,
      duration_ms: Date.now() - started,
      error_code: mapped.code,
      tools: report.toolRuns
    }));
    return failure(mapped.code, mapped.retryable);
  }
}

module.exports = { reply: reply };
