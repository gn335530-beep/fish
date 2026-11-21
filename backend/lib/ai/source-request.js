/* 來源請求：偵測要求、從上一則重查工具；不暫存任何來源。 */

const { all } = require("../store");
const { normalizeRegion } = require("../regions");
const questions = require("./question-types");
const places = require("../conditions/places");
const { isPlatformText } = require("./classify");
const { sourcesOf, localSources } = require("./sources");
const regionStore = require("./region-store");
const conditions = require("./tools/conditions");
const web = require("./tools/web");
const localContext = require("./local-context");

const SOURCE_REQUEST = /(連結|網址|來源|出處|哪裡看|哪個網站|資料哪來|引用|查證)/;
const NO_SOURCE_TEXT = "目前沒有可提供的來源。";
const SOURCE_TEXT = "以下是上一則的資料來源。";

function isRequest(text) {
  return SOURCE_REQUEST.test(String(text || ""));
}

function isOnlyRequest(text) {
  const rest = String(text || "")
    .replace(SOURCE_REQUEST, "")
    .replace(/(請問|麻煩|可以|給我|提供|一下|我要看|想看|給我看|上一則|以上|有|嗎|呢|的|這|那|個|網站|頁面|資料)/g, "")
    .replace(/[，,。.!！?？:：;；、\s]/g, "");
  return rest === "";
}

function kindFor(text) {
  const value = String(text || "");
  if (isPlatformText(value)) return "platform";
  const foreign = questions.hasForeignPlace(value);
  if (questions.isWeatherQuestion(value)) return foreign ? "web" : "weather";
  if (questions.isSeaTopicQuestion(value)) {
    return foreign && !places.seaAreaInText(value) ? "web" : "sea";
  }
  if (questions.isLocalInfoQuestion(value) || foreign) return "web";
  return "";
}

function sourcesForTurn(toolResults) {
  const local = toolResults && toolResults.local;
  if (local) {
    const rows = localSources(local);
    if (rows.length) return rows;
  }
  return sourcesOf(toolResults && toolResults.webResults);
}

function previousUser(conversationId, anchor) {
  const anchorSeq = Number(anchor && anchor.seq);
  return all("messages").filter(function (message) {
    return String(message.conversation_id) === String(conversationId) &&
      message.type === "text" &&
      message.sender_id !== "ai" &&
      message.sender_id !== "system" &&
      Number(message.seq) < anchorSeq &&
      !isOnlyRequest(message.text);
  }).sort(function (a, b) { return Number(b.seq) - Number(a.seq); })[0] || null;
}

function noSources() {
  return { text: NO_SOURCE_TEXT, sources: [], intent: "CHAT" };
}

function sourceReply(sources, intent) {
  if (!sources.length) return noSources();
  return { text: SOURCE_TEXT, sources: sources, intent: intent };
}

async function weatherOrSeaSources(previous, kind, options) {
  const city = localContext.cityInText(previous.text) ||
    regionStore.cityOf(options.conversationId) ||
    normalizeRegion(options.user && options.user.city) ||
    "";
  const seaArea = places.seaAreaInText(previous.text) ||
    (city ? places.seaAreaForCity(city) : "");
  if (kind === "weather" && !city) return [];
  if (kind === "sea" && !seaArea) return [];
  try {
    const local = await conditions.run({
      mode: kind,
      city: city,
      sea_area: seaArea
    }, options.ctx);
    return localSources(local);
  } catch (error) {
    return [];
  }
}

async function webSources(previous, options) {
  if (!options.ctx || !options.ctx.webEnabled) return [];
  try {
    const result = await web.run({ query: previous.text }, options.ctx);
    return sourcesOf(result.results);
  } catch (error) {
    return [];
  }
}

/* 下一句只要求來源：重查上一則問題對應的工具，不呼叫模型。 */
async function previousReply(options) {
  const previous = previousUser(options.conversationId, options.anchor);
  if (!previous) return noSources();
  const kind = kindFor(previous.text);
  if (!kind || kind === "platform") return noSources();
  const sources = kind === "web"
    ? await webSources(previous, options)
    : await weatherOrSeaSources(previous, kind, options);
  return sourceReply(sources, kind === "web" ? "WEB" : "CHAT");
}

module.exports = {
  isRequest: isRequest,
  isOnlyRequest: isOnlyRequest,
  kindFor: kindFor,
  sourcesForTurn: sourcesForTurn,
  previousReply: previousReply,
  NO_SOURCE_TEXT: NO_SOURCE_TEXT
};
