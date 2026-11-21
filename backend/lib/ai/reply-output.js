/* 回覆輸出：直接回覆、來源補充、在地失敗文案與查詢範圍後綴。 */

const { logReply } = require("./log");
const { NO_SOURCE_TEXT } = require("./sources");
const advice = require("./fishing-advice");

const NO_PRODUCTS_TEXT = "目前沒有符合條件的商品，可以換個魚種、地區或預算再試。";
const FOREIGN_WEATHER_NOT_FOUND = "查不到國外地點天氣，請稍後再試。";

function directReply(baseLog, started, text, toolResults, extra) {
  const settings = extra || {};
  const replyIntent = settings.intent || "CHAT";
  logReply(Object.assign({}, baseLog, {
    intent: replyIntent,
    tokens: { input: 0, output: 0, total: 0 },
    duration_ms: Date.now() - started,
    /* 回應固定 error_code:null；這裡只讓內部 log 保留上游錯誤碼。 */
    error_code: settings.logErrorCode || null,
    tools: []
  }));
  return {
    handled: true,
    intent: replyIntent,
    slots: {},
    reply_text: text,
    sources: settings.sources || [],
    tool_results: toolResults || {},
    error_code: null,
    retryable: false
  };
}

function withSourceNote(text, wantsSources) {
  return wantsSources ? text + "\n" + NO_SOURCE_TEXT : text;
}

function foreignWeatherFailure(wantsSources) {
  return withSourceNote(FOREIGN_WEATHER_NOT_FOUND, wantsSources);
}

function localFailureText(local) {
  if (!local) return "";
  if (local.error === "NO_REGION") return "你所在的縣市是哪裡？";
  if (local.error === "NO_SEA_AREA") return "你想問哪個海域？";
  if (local.mode === "weather" && !local.weather) return "查不到即時天氣，請稍後再試。";
  if (local.mode === "sea" && !local.marine && !local.weather) {
    return "查不到海況與天氣，請稍後再試。";
  }
  return "";
}

/* 釣魚建議缺資料或在地工具失敗時的直接回覆；沒有就直接進模型文字。 */
function localFallback(local, options) {
  const settings = options || {};
  if (settings.wantsAdvice) {
    const missing = advice.missingText(local);
    if (missing) {
      return {
        text: withSourceNote(missing, settings.wantsSources),
        toolResults: { local: local }
      };
    }
  }
  const failure = localFailureText(local);
  if (!failure) return null;
  return {
    text: withSourceNote(failure, settings.wantsSources),
    toolResults: { local: local }
  };
}

function replySuffix(intent, replyText, scope) {
  return intent === "PRODUCT_RECOMMEND" && replyText &&
    String(replyText).indexOf(scope) === -1
    ? "（查詢範圍：" + scope + "）"
    : "";
}

module.exports = {
  NO_PRODUCTS_TEXT: NO_PRODUCTS_TEXT,
  FOREIGN_WEATHER_NOT_FOUND: FOREIGN_WEATHER_NOT_FOUND,
  directReply: directReply,
  withSourceNote: withSourceNote,
  foreignWeatherFailure: foreignWeatherFailure,
  localFailureText: localFailureText,
  localFallback: localFallback,
  replySuffix: replySuffix
};
