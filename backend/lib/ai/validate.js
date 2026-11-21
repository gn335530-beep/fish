/* 輸出驗證：JSON／schema 不合格回 INVALID_OUTPUT；來源與 URL 在此隱藏；數字防護見 guard.js。 */

const { isPlainObject } = require("./json");
const guard = require("./guard");
const localGuard = require("./local-guard");
const evidence = require("./evidence");
const { safeSources, NO_SOURCE_TEXT } = require("./sources");
const { TIDE_MISSING_TEXT, TEMP_MISSING_TEXT, needsTideNote, needsTemperatureNote,
  withNotes, assertWeatherOnly } = require("./reply-output");
const { llmError } = require("./error");

const INTENTS = [
  "SELL", "BUY", "MARKET", "CANCEL", "EDIT", "CHAT", "WEB", "PRODUCT_RECOMMEND", "UNKNOWN"
];
const PLATFORM_INTENTS = ["SELL", "BUY", "MARKET", "CANCEL", "EDIT"];
const REPLY_INTENTS = ["CHAT", "WEB", "PRODUCT_RECOMMEND"];
const EDIT_FIELDS = ["fish_species", "quantity", "condition", "photo_url", "price"];
const MAX_REPLY = 500;
const URL_RE = /https?:\/\/[^\s<>"'，。！？；：、（）【】\u4e00-\u9fff]+/gi;

function invalidOutput() {
  return llmError("LLM_INVALID_OUTPUT");
}

/* WEB 的定義是「這一輪成功用了網路資料」；平台意圖不升級。 */
function finalIntent(intent, webResults) {
  const webUsed = Array.isArray(webResults) && webResults.length > 0;
  if (webUsed && PLATFORM_INTENTS.indexOf(intent) === -1) return "WEB";
  return intent;
}

function isPlatformIntent(intent) {
  return PLATFORM_INTENTS.indexOf(intent) !== -1;
}

function parseOutput(raw) {
  let text = String(raw == null ? "" : raw).trim();
  if (!text) throw invalidOutput();
  if (text.indexOf("```") === 0) {
    text = text.replace(/^```[a-zA-Z]*\s*/, "").replace(/\s*```$/, "").trim();
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw invalidOutput();
  }
  if (!isPlainObject(parsed)) throw invalidOutput();
  if (INTENTS.indexOf(parsed.intent) === -1) throw invalidOutput();
  return parsed;
}

function validString(value, max) {
  return typeof value === "string" && value.trim() !== "" && value.length <= max;
}

/* 來源預設隱藏：模型自填的連結一律從文字移除，避免出現在畫面或 API。 */
function stripUrls(text) {
  return String(text || "")
    .replace(URL_RE, "")
    .replace(/[ \t]+([，。！？；：、])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sanitizeSlots(raw) {
  if (raw == null) return {};
  if (!isPlainObject(raw)) throw invalidOutput();
  const slots = {};

  if (raw.fish_species !== undefined) {
    if (!validString(raw.fish_species, 30)) throw invalidOutput();
    slots.fish_species = raw.fish_species.trim();
  }
  if (raw.species_code !== undefined && raw.species_code !== null) {
    if (!Number.isInteger(Number(raw.species_code)) || Number(raw.species_code) <= 0) {
      throw invalidOutput();
    }
    slots.species_code = Number(raw.species_code);
  }
  if (raw.quantity !== undefined) {
    if (!Number.isInteger(raw.quantity) || raw.quantity <= 0) throw invalidOutput();
    slots.quantity = raw.quantity;
  }
  if (raw.condition !== undefined) {
    if (!validString(raw.condition, 20)) throw invalidOutput();
    slots.condition = raw.condition.trim();
  }
  ["price", "price_per_taijin"].forEach(function (key) {
    if (raw[key] === undefined) return;
    if (!Number.isFinite(raw[key]) || raw[key] <= 0) throw invalidOutput();
    slots[key] = raw[key];
  });
  if (raw.region !== undefined) {
    if (!validString(raw.region, 20)) throw invalidOutput();
    slots.region = raw.region.trim();
  }
  if (raw.edit_field !== undefined) {
    if (EDIT_FIELDS.indexOf(raw.edit_field) === -1) throw invalidOutput();
    slots.edit_field = raw.edit_field;
  }
  if (raw.edit_value !== undefined) {
    if (raw.edit_field === undefined) throw invalidOutput();
    const typed = typeof raw.edit_value;
    if (typed !== "string" && typed !== "number") throw invalidOutput();
    if (raw.edit_field === "quantity" || raw.edit_field === "price") {
      const numeric = Number(raw.edit_value);
      if (!Number.isFinite(numeric) || numeric <= 0) throw invalidOutput();
      slots.edit_value = numeric;
    } else {
      slots.edit_value = raw.edit_value;
    }
  }
  return slots;
}

function normalizeOutput(parsed, options) {
  const slots = sanitizeSlots(parsed.slots);
  /* 模型提供的 sources 一律丟棄；後端預設不回傳來源。 */
  if (parsed.tool_results != null && !isPlainObject(parsed.tool_results)) throw invalidOutput();
  const sources = options.includeSources === true ? safeSources(options.sources) : [];
  const localResults = options.toolResults && options.toolResults.local;

  let replyText = parsed.reply_text == null ? null : parsed.reply_text;
  if (replyText !== null && typeof replyText !== "string") throw invalidOutput();
  if (replyText !== null) replyText = stripUrls(replyText) || null;
  /* 查詢範圍後綴只在加入後仍不超過上限時附加；超限就省略，保留原回覆。 */
  if (replyText && options.replySuffix &&
    replyText.length + options.replySuffix.length <= MAX_REPLY) {
    replyText += options.replySuffix;
  }
  if (replyText !== null && replyText.length > MAX_REPLY) throw invalidOutput();

  const platform = PLATFORM_INTENTS.indexOf(parsed.intent) !== -1;
  if (platform) {
    replyText = null;
  } else if (REPLY_INTENTS.indexOf(parsed.intent) !== -1 && !replyText) {
    throw invalidOutput();
  }
  const notes = [];
  if (!platform && parsed.intent !== "PRODUCT_RECOMMEND") {
    if (needsTemperatureNote(replyText, localResults)) notes.push(TEMP_MISSING_TEXT);
    if (needsTideNote(replyText, localResults)) notes.push(TIDE_MISSING_TEXT);
  }
  /* 要求來源但沒有任何後端來源時，明確說明沒有。 */
  if (!platform && options.includeSources === true && !sources.length &&
    (!replyText || replyText.indexOf(NO_SOURCE_TEXT) === -1)) {
    notes.push(NO_SOURCE_TEXT);
  }
  replyText = withNotes(replyText, notes, MAX_REPLY);

  const officialText = evidence.officialText(options.toolResults, options.toolNames);
  const webText = evidence.webText(options.webResults);
  const localText = evidence.localText(localResults);
  const localUsed = (options.toolNames || []).indexOf("get_local_conditions") !== -1;
  const slotPool = guard.numbersIn(options.userText).concat(guard.numbersIn(officialText));

  let replyEvidence = officialText;
  if (parsed.intent === "WEB") {
    replyEvidence = localUsed ? webText + "\n" + localText : webText;
  }
  if (parsed.intent === "PRODUCT_RECOMMEND") {
    replyEvidence = evidence.productsText(options.toolResults && options.toolResults.products);
  }

  const replyPool = parsed.intent === "WEB"
    ? guard.numbersIn(replyEvidence)
    : guard.numbersIn(options.userText).concat(guard.numbersIn(replyEvidence));
  const replyContext = parsed.intent === "WEB"
    ? replyEvidence
    : options.userText + "\n" + replyEvidence;
  guard.assertSlotsGrounded(slots, slotPool);
  guard.assertReplyGrounded(replyText, replyPool, replyContext, {
    strict: parsed.intent === "WEB" || localUsed
  });
  if (localUsed) {
    localGuard.assertLocalDateTimes(replyText, localText, localResults);
    localGuard.assertLocalUnits(replyText, localResults, options.userText);
    localGuard.assertLocalDirections(replyText, localResults);
  }
  assertWeatherOnly(replyText, options.localMode);

  return {
    intent: parsed.intent,
    slots: slots,
    reply_text: replyText,
    /* 只有使用者明確要求來源時才回傳後端工具產生的來源。 */
    sources: sources,
    tool_results: options.toolResults || {}
  };
}

module.exports = {
  parseOutput: parseOutput,
  normalizeOutput: normalizeOutput,
  finalIntent: finalIntent,
  isPlatformIntent: isPlatformIntent
};
