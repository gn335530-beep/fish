/* 回覆輸出：直接回覆、來源補充、在地失敗文案與查詢範圍後綴。 */

const { logReply } = require("./log");
const sourceRequest = require("./source-request");

const NO_PRODUCTS_TEXT = "目前沒有符合條件的商品，可以換個魚種、地區或預算再試。";

function directReply(baseLog, started, text, toolResults, extra) {
  const settings = extra || {};
  const replyIntent = settings.intent || "CHAT";
  logReply(Object.assign({}, baseLog, {
    intent: replyIntent,
    tokens: { input: 0, output: 0, total: 0 },
    duration_ms: Date.now() - started,
    error_code: null,
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
  return wantsSources ? text + "\n" + sourceRequest.NO_SOURCE_TEXT : text;
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

function replySuffix(intent, replyText, scope) {
  return intent === "PRODUCT_RECOMMEND" && replyText &&
    String(replyText).indexOf(scope) === -1
    ? "（查詢範圍：" + scope + "）"
    : "";
}

module.exports = {
  NO_PRODUCTS_TEXT: NO_PRODUCTS_TEXT,
  directReply: directReply,
  withSourceNote: withSourceNote,
  localFailureText: localFailureText,
  replySuffix: replySuffix
};
