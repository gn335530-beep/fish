/* 輸出驗證：JSON／schema／sources 不合格回 INVALID_OUTPUT；數字防護見 guard.js。 */

const { isPlainObject } = require("./json");
const guard = require("./guard");

const INTENTS = [
  "SELL", "BUY", "MARKET", "CANCEL", "EDIT", "CHAT", "WEB", "PRODUCT_RECOMMEND", "UNKNOWN"
];
const PLATFORM_INTENTS = ["SELL", "BUY", "MARKET", "CANCEL", "EDIT"];
const REPLY_INTENTS = ["CHAT", "WEB"];
const SOURCE_INTENTS = ["WEB"];
const EDIT_FIELDS = ["fish_species", "quantity", "condition", "photo_url", "price"];
const MAX_REPLY = 500;

function outputError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function invalidOutput() {
  return outputError("LLM_INVALID_OUTPUT");
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

function sanitizeSources(raw) {
  if (raw == null) return [];
  if (!Array.isArray(raw) || raw.length > 3) throw invalidOutput();
  return raw.map(function (source) {
    if (!isPlainObject(source)) throw invalidOutput();
    if (!validString(source.title, 120) || typeof source.url !== "string") throw invalidOutput();
    let url;
    try {
      url = new URL(source.url);
    } catch (error) {
      throw invalidOutput();
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") throw invalidOutput();
    return { title: source.title.trim(), url: source.url };
  });
}

function normalizeOutput(parsed, options) {
  const slots = sanitizeSlots(parsed.slots);
  const sources = sanitizeSources(parsed.sources);
  /* 這一版沒有工具；模型自行填的 tool_results 不能當成數字依據。 */
  if (parsed.tool_results != null && !isPlainObject(parsed.tool_results)) throw invalidOutput();

  let replyText = parsed.reply_text == null ? null : parsed.reply_text;
  if (replyText !== null) {
    if (typeof replyText !== "string" || replyText.length > MAX_REPLY) throw invalidOutput();
    replyText = replyText.trim() || null;
  }

  const platform = PLATFORM_INTENTS.indexOf(parsed.intent) !== -1;
  if (platform) {
    replyText = null;
  } else if (parsed.intent === "PRODUCT_RECOMMEND") {
    /* 商品推薦需要後端工具與商品卡（ticket 05）；目前不寫半套回覆。 */
    replyText = null;
  } else if (REPLY_INTENTS.indexOf(parsed.intent) !== -1 && !replyText) {
    throw invalidOutput();
  }

  const pool = guard.numbersIn(options.userText);
  guard.assertSlotsGrounded(slots, pool);
  guard.assertReplyGrounded(replyText, pool, options.userText);

  return {
    intent: parsed.intent,
    slots: slots,
    reply_text: replyText,
    sources: platform || SOURCE_INTENTS.indexOf(parsed.intent) === -1 ? [] : sources,
    tool_results: {}
  };
}

module.exports = {
  parseOutput: parseOutput,
  normalizeOutput: normalizeOutput
};
