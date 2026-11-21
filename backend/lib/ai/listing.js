/* listing 模式：模型驅動的上架草稿變更與回覆契約（walking skeleton）。
   只回草稿變更與下一個動作，不寫資料庫、不發布商品；驗證與防護由本模組把關。 */

const provider = require("./provider");
const { llmError } = require("./error");
const { mapError, failure } = require("./result");
const { isPlainObject } = require("./json");
const { numbersIn } = require("./guard");
const { historyFor, contextSummary } = require("./history");
const { logReply } = require("./log");

const LISTING_FIELDS = ["fish_species", "quantity", "condition", "price", "price_per_taijin"];
const NUMBER_FIELDS = ["quantity", "price", "price_per_taijin"];
const NEXT_ACTIONS = ["ask", "show_market_card", "show_draft_card", "none"];
const NON_PRICE_FIELDS = ["fish_species", "quantity", "condition", "photo_url"];

const LISTING_PROMPT = [
  "你是「一支釣」平台的小幫手，正在協助釣客上架漁獲。只回繁體中文，語氣簡短、友善。",
  "你只能輸出一個合法 JSON 物件，不要 markdown、不要程式碼圍籬、不要 JSON 以外的文字。",
  'JSON 欄位：{"reply_text":string|null,"corrections":[],"draft_changes":{},"protected_names":[],"condition_proposal":string|null,"next_action":"ask|show_market_card|show_draft_card|none"}',
  "規則：",
  "1. draft_changes 只放使用者這一則訊息明確提到的欄位：fish_species、quantity、condition、price、price_per_taijin。不要改這一則訊息沒提到的欄位，不要改照片或代碼。",
  "2. quantity、price、price_per_taijin 是數字，只能來自使用者這一則訊息；不要從行情、常識或前文推測，不要自己編數字。",
  "3. 你不能發布、下架、刪除或修改已上架商品；那些由平台按鈕處理。",
  "4. next_action：ask 表示要問下一個欄位；show_market_card 表示非價格欄位已齊、要顯示行情卡；show_draft_card 表示全部欄位已齊、要顯示草稿卡；none 表示不動作。價格要最後問。",
  "5. 你修正魚種或處理方式錯字時，把修正記在 corrections（每筆含 field、original、corrected），並在 reply_text 告訴使用者「什麼改成什麼」。",
  "6. 使用者明確說「保留我打的字」時，把該字串加進 protected_names。",
  "7. 空值省略，不要填假值。"
].join("\n");

function isListingContext(context) {
  return !!context && context.mode === "listing" && !!context.draft;
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

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
    if (LISTING_FIELDS.indexOf(item.field) === -1) throw guardRejected();
    const original = String(item.original == null ? "" : item.original);
    const corrected = String(item.corrected == null ? "" : item.corrected);
    if (!original || !corrected) throw guardRejected();
    return { field: item.field, original: original, corrected: corrected };
  });
}

function effectiveDraft(draft, changes) {
  const out = Object.assign({}, draft || {});
  Object.keys(changes).forEach(function (key) { out[key] = changes[key]; });
  return out;
}

function nonPriceComplete(draft) {
  return NON_PRICE_FIELDS.every(function (slot) { return hasValue(draft[slot]); });
}

function allComplete(draft) {
  return nonPriceComplete(draft) && hasValue(draft.price);
}

/* 顯示時機由程式把關：卡片只能在全欄位／非價格欄位完成後顯示。 */
function validateNextAction(action, draft) {
  if (action === "show_market_card" && !(nonPriceComplete(draft) && !hasValue(draft.price))) {
    return "ask";
  }
  if (action === "show_draft_card" && !allComplete(draft)) return "ask";
  return action || "ask";
}

function appendHistory(existing, corrections) {
  const base = Array.isArray(existing) ? existing.slice() : [];
  const now = new Date().toISOString();
  corrections.forEach(function (correction) {
    base.push({
      field: correction.field,
      original: correction.original,
      corrected: correction.corrected,
      time: now
    });
  });
  return base;
}

function mergeProtectedNames(existing, added) {
  const merged = Array.isArray(existing) ? existing.slice() : [];
  (added || []).forEach(function (name) {
    if (typeof name === "string" && name && merged.indexOf(name) === -1) merged.push(name);
  });
  return merged;
}

function logListing(baseLog, started, errorCode, tokens) {
  logReply(Object.assign({}, baseLog, {
    intent: "SELL",
    tokens: tokens || { input: 0, output: 0, total: 0 },
    duration_ms: Date.now() - started,
    error_code: errorCode,
    tools: []
  }));
}

async function reply(options, config, baseLog, started) {
  try {
    const raw = await provider.generate({
      model: config.model,
      timeoutMs: config.timeoutMs,
      system: LISTING_PROMPT,
      context: contextSummary(options.context),
      messages: historyFor(options.conversation.id, options.message)
    });
    const parsed = parseListingOutput(raw.text);
    const changes = validateDraftChanges(parsed.draft_changes, options.message.text);
    const corrections = validateCorrections(parsed.corrections);
    const draft = effectiveDraft(options.context.draft, changes);
    const result = {
      handled: true,
      intent: "SELL",
      slots: {},
      listing: {
        reply_text: parsed.reply_text || null,
        corrections: corrections,
        draft_changes: changes,
        correction_history: appendHistory(options.context.correction_history, corrections),
        protected_names: mergeProtectedNames(options.context.protected_names, parsed.protected_names),
        condition_proposal: parsed.condition_proposal || null,
        next_action: validateNextAction(parsed.next_action, draft)
      },
      reply_text: null,
      sources: [],
      tool_results: {},
      error_code: null,
      retryable: false
    };
    logListing(baseLog, started, null, provider.tokenCounts(raw && raw.usage));
    return result;
  } catch (error) {
    const mapped = mapError(error);
    logListing(baseLog, started, mapped.code);
    return failure(mapped.code, mapped.retryable);
  }
}

module.exports = {
  LISTING_FIELDS: LISTING_FIELDS,
  isListingContext: isListingContext,
  validateDraftChanges: validateDraftChanges,
  reply: reply
};
