/* AI 回覆流程：開關、設定、歷史、輸出驗證、log 與錯誤映射；工具迴圈見 tool-loop。 */

const { llmConfig } = require("./config");
const localContext = require("./local-context");
const advice = require("./fishing-advice");
const sourceRequest = require("./source-request");
const { parseOutput, normalizeOutput, finalIntent, isPlatformIntent } = require("./validate");
const tools = require("./tools");
const toolLoop = require("./tool-loop");
const { logReply } = require("./log");
const { failure, mapError, webFailureCode } = require("./result");
const { llmError } = require("./error");
const listing = require("./listing");
const { directReply, foreignWeatherFailure, localFallback, replySuffix, NO_PRODUCTS_TEXT } =
  require("./reply-output");
const { prepareTurn } = require("./prepare");

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

  if (listing.isListingContext(options.context)) {
    return listing.reply(options, config, baseLog, started);
  }
  const webEnabled = config.webSearch && Boolean(config.tavilyApiKey);
  const prepared = await prepareTurn(options, config, webEnabled, baseLog, started);
  if (prepared.reply) return prepared.reply;
  const { input, local, wantsSources, foreignWeather, wantsAdvice, forceTool } = prepared;

  try {
    const loop = await toolLoop.run(input, {
      timeoutMs: config.timeoutMs,
      searchTimeoutMs: config.searchTimeoutMs,
      toolDefs: tools.definitions({ webEnabled: webEnabled, localEnabled: !foreignWeather }),
      forceTool: forceTool,
      prefillTool: config.prefillTool,
      toolCtx: {
        user: options.user,
        webEnabled: webEnabled,
        localEnabled: !foreignWeather,
        tavilyApiKey: config.tavilyApiKey,
        cwaApiKey: config.cwaApiKey,
        local: localContext.toolContext(local)
      }
    }, report);

    if (foreignWeather && !loop.webResults.length) {
      return directReply(baseLog, started, foreignWeatherFailure(wantsSources));
    }

    const parsed = parseOutput(loop.raw.text);
    if (!isPlatformIntent(parsed.intent)) {
      const fallback = localFallback(loop.toolResults.local, {
        wantsAdvice: wantsAdvice,
        wantsSources: wantsSources
      });
      if (fallback) {
        return directReply(baseLog, started, fallback.text, fallback.toolResults);
      }
    }

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
    const includeSources = wantsSources && !isPlatformIntent(parsed.intent);
    const sources = includeSources
      ? sourceRequest.sourcesFromTools({
        local: loop.toolResults.local,
        webResults: loop.webResults
      })
      : [];
    const output = normalizeOutput(Object.assign({}, parsed, { intent: intent }), {
      userText: options.message.text, localMode: local.mode,
      toolResults: loop.toolResults,
      toolNames: report.toolRuns.filter(function (run) { return !run.error_code; })
        .map(function (run) { return run.name; }),
      webResults: loop.webResults,
      includeSources: includeSources,
      sources: sources,
      replySuffix: replySuffix(intent, parsed.reply_text, scope)
    });
    if (loop.toolResults.market && loop.toolResults.market.found === false) {
      const text = output.reply_text || "";
      if (text && (/\d/.test(text) || text.indexOf("暫無行情") === -1)) {
        throw llmError("LLM_GUARD_REJECTED");
      }
    }
    if (intent === "WEB" && !loop.webResults.length) throw llmError("LLM_GUARD_REJECTED");
    if (wantsAdvice || (local.active && local.mode)) {
      advice.assertSafe(output.reply_text, { advice: wantsAdvice });
    }

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
    const webFailure = foreignWeather ? webFailureCode(report) : "";
    if (webFailure) {
      return directReply(baseLog, started, foreignWeatherFailure(wantsSources), {},
        { logErrorCode: webFailure });
    }
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
