/* listing 輸出驗證：JSON 解析、草稿變更白名單、修正結構；不做魚種或處理方式語意驗證。 */

const { isPlainObject } = require("./json");
const { numbersIn } = require("./guard");
const { llmError } = require("./error");

const LISTING_FIELDS = ["fish_species", "quantity", "condition", "price", "price_per_taijin"];
const NUMBER_FIELDS = ["quantity", "price", "price_per_taijin"];
const CORRECTION_FIELDS = ["fish_species", "condition"];
const NEXT_ACTIONS = ["ask", "show_market_card", "show_draft_card", "none"];

function invalidOutput() { return llmError("LLM_INVALID_OUTPUT"); }

function guardRejected() { return llmError("LLM_GUARD_REJECTED"); }

function parseListingOutput(raw) {
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
  if (parsed.next_action !== undefined && NEXT_ACTIONS.indexOf(parsed.next_action) === -1) {
    throw invalidOutput();
  }
  if (parsed.condition_ask !== undefined && typeof parsed.condition_ask !== "boolean") {
    throw invalidOutput();
  }
  return parsed;
}

/* 草稿變更只接受白名單欄位；數字必須出現在釣客這一則訊息，否則整輪丟棄。 */
function validateDraftChanges(raw, userText) {
  if (raw == null) return {};
  if (!isPlainObject(raw)) throw guardRejected();
  const numbers = numbersIn(userText);
  const changes = {};
  Object.keys(raw).forEach(function (key) {
    if (LISTING_FIELDS.indexOf(key) === -1) throw guardRejected();
    const value = raw[key];
    if (value === undefined || value === null || value === "") return;
    if (NUMBER_FIELDS.indexOf(key) !== -1) {
      const number = Number(value);
      if (!Number.isFinite(number) || number <= 0) throw guardRejected();
      if (numbers.indexOf(number) === -1) throw guardRejected();
      changes[key] = number;
    } else {
      if (typeof value !== "string" || !String(value).trim()) throw guardRejected();
      changes[key] = String(value).trim();
    }
  });
  return changes;
}

function validateCorrections(raw) {
  if (raw == null) return [];
  if (!Array.isArray(raw)) throw guardRejected();
  return raw.map(function (item) {
    if (!isPlainObject(item)) throw guardRejected();
    if (CORRECTION_FIELDS.indexOf(item.field) === -1) throw guardRejected();
    const original = String(item.original == null ? "" : item.original);
    const corrected = String(item.corrected == null ? "" : item.corrected);
    if (!original || !corrected) throw guardRejected();
    return { field: item.field, original: original, corrected: corrected };
  });
}

module.exports = {
  LISTING_FIELDS: LISTING_FIELDS,
  NEXT_ACTIONS: NEXT_ACTIONS,
  parseListingOutput: parseListingOutput,
  validateDraftChanges: validateDraftChanges,
  validateCorrections: validateCorrections,
  guardRejected: guardRejected
};
