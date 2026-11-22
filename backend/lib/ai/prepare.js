/* 回覆前置：來源要求、縣市／海域追問等直接回覆，否則準備模型輸入。 */

const { SYSTEM_PROMPT } = require("./prompt");
const { forceToolForTurn } = require("./classify");
const localContext = require("./local-context");
const questions = require("./question-types");
const sourceRequest = require("./source-request");
const { historyFor, contextSummary } = require("./history");
const { directReply } = require("./reply-output");

/* 回傳 { reply } 表示可直接回覆；否則回傳準備好的模型輸入與在地 context。 */
async function prepareTurn(options, config, webEnabled, baseLog, started) {
  const text = options.message.text;
  const preflight = await sourceRequest.preflight({
    conversationId: options.conversation.id,
    anchor: options.message,
    text: text,
    user: options.user,
    ctx: {
      timeoutMs: config.timeoutMs,
      webEnabled: webEnabled,
      tavilyApiKey: config.tavilyApiKey,
      cwaApiKey: config.cwaApiKey
    }
  });
  if (preflight.direct) {
    return {
      reply: directReply(baseLog, started, preflight.direct.text, {}, {
        sources: preflight.direct.sources, intent: preflight.direct.intent
      })
    };
  }

  const local = localContext.prepare({
    conversationId: options.conversation.id,
    text: text,
    user: options.user
  });
  if (local.askCity) return { reply: directReply(baseLog, started, "你所在的縣市是哪裡？") };
  if (local.askSea) return { reply: directReply(baseLog, started, "你想問哪個海域？") };
  if (local.ackCity) {
    return {
      reply: directReply(baseLog, started, "好的，已記住你在" + local.ackCity + "。想問天氣、海況或在地資訊嗎？")
    };
  }

  const wantsSources = preflight.wantsSources;
  const foreignWeather = preflight.foreignWeather;
  const sourceKind = wantsSources ? sourceRequest.sourceKindFor(text) : "";
  const forceTool = forceToolForTurn(text, {
    webEnabled: webEnabled,
    wantsSources: wantsSources,
    sourceKind: sourceKind
  });
  const wantsAdvice = questions.isFishingQuestion(text);
  const localPlace = local.seaArea || local.city;
  const input = {
    model: config.model,
    timeoutMs: config.timeoutMs,
    system: SYSTEM_PROMPT + localContext.dateLine() +
      (local.active && localPlace ? localContext.promptLine(localPlace) : ""),
    context: contextSummary(options.context),
    messages: historyFor(options.conversation.id, options.message)
  };
  return {
    input: input,
    local: local,
    wantsSources: wantsSources,
    foreignWeather: foreignWeather,
    wantsAdvice: wantsAdvice,
    forceTool: forceTool
  };
}

module.exports = { prepareTurn: prepareTurn };
