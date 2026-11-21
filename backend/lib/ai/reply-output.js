/* 回覆輸出：直接回覆、來源補充、在地失敗文案與查詢範圍後綴。 */

const { logReply } = require("./log");
const { NO_SOURCE_TEXT } = require("./sources");
const advice = require("./fishing-advice");

const NO_PRODUCTS_TEXT = "目前沒有符合條件的商品，可以換個魚種、地區或預算再試。";
const FOREIGN_WEATHER_NOT_FOUND = "查不到國外地點天氣，請稍後再試。";
const TIDE_MISSING_TEXT = "潮汐暫無資料";

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

function tideMissing(local) {
  return Boolean(local && local.found === true && local.mode === "sea" && !local.tide);
}

function needsTideNote(replyText, local) {
  return Boolean(replyText && tideMissing(local) &&
    replyText.indexOf(TIDE_MISSING_TEXT) === -1);
}

function appendTideNote(text, local) {
  return needsTideNote(text, local) ? text + "\n" + TIDE_MISSING_TEXT : text;
}

/* 提示句優先保留；空間不足時截斷模型文字，不丟掉提示。 */
function withNotes(replyText, notes, maxLength) {
  if (!notes.length) return replyText;
  const noteText = notes.join("\n");
  if (noteText.length >= maxLength) return noteText.slice(0, maxLength);
  if (!replyText) return noteText;
  const available = maxLength - noteText.length - 1;
  const base = available > 0 ? replyText.slice(0, available).trim() : "";
  return base ? base + "\n" + noteText : noteText;
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
  function result(text) {
    return {
      text: appendTideNote(withSourceNote(text, settings.wantsSources), local),
      toolResults: { local: local }
    };
  }
  if (settings.wantsAdvice) {
    const missing = advice.missingText(local);
    if (missing) return result(missing);
  }
  const failure = localFailureText(local);
  return failure ? result(failure) : null;
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
  TIDE_MISSING_TEXT: TIDE_MISSING_TEXT,
  directReply: directReply,
  withSourceNote: withSourceNote,
  foreignWeatherFailure: foreignWeatherFailure,
  tideMissing: tideMissing,
  needsTideNote: needsTideNote,
  appendTideNote: appendTideNote,
  withNotes: withNotes,
  localFailureText: localFailureText,
  localFallback: localFallback,
  replySuffix: replySuffix
};
