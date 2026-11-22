/* 對話歷史與 context 摘要：只把模型需要的欄位送出，卡片不送完整 JSON。 */

const { all, findById } = require("../store");
const { redactText, redactFields } = require("./redact");

const DRAFT_KEYS = [
  "fish_species", "species_code", "quantity", "condition", "price", "price_per_taijin"
];

const HISTORY_LIMIT = 10;
/* 歷史只留必要上下文：助手長回覆截短，降低模型重複先前內容與 token 用量。 */
const MAX_ASSISTANT_HISTORY = 120;
const MAX_USER_HISTORY = 300;

function oneLine(value) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
}

function cardSummary(card) {
  const type = card && card.type;
  if (type === "product") {
    return "商品卡：" + oneLine(card.fish_species) + "，" + Number(card.quantity || 0) +
      " 尾，整批 " + Number(card.price || 0) + " 元";
  }
  if (type === "market_quote") {
    return "行情卡：" + oneLine(card.species_name || card.official_name) + "，" +
      Number(card.price_per_taijin || 0) + " 元／台斤，" + oneLine(card.trade_date);
  }
  if (type === "draft") {
    const draft = card.draft || {};
    return "草稿卡：" + oneLine(draft.fish_species) + "，" + Number(draft.quantity || 0) +
      " 尾，" + oneLine(draft.condition);
  }
  if (type === "deal") {
    return "協議卡：" + oneLine(card.status) + "，整單 " + Number(card.final_price || 0) + " 元";
  }
  if (type === "deal_cancelled") return "取消協議卡";
  if (type === "review") return "評價卡";
  if (type === "legal_consent") return "法規告知卡";
  if (type === "draft_cancel") return "取消上架確認卡";
  if (type === "sources") return "資料來源卡";
  return "卡片：" + oneLine(type || "未知");
}

function messageLine(message) {
  if (message.type === "card") return cardSummary(message.card);
  if (message.type !== "text") return "";
  const max = message.sender_id === "ai" ? MAX_ASSISTANT_HISTORY : MAX_USER_HISTORY;
  const text = oneLine(message.text);
  return text.length <= max ? text : text.slice(0, max);
}

function isDialogMessage(message) {
  return (message.type === "text" || message.type === "card") && message.sender_id !== "system";
}

/* 依 seq 取錨定訊息（含）以前、同一間助手房的最近 10 則使用者／助手訊息。 */
function historyFor(conversationId, anchor) {
  const anchorSeq = anchor ? Number(anchor.seq) : null;
  const rows = all("messages")
    .filter(function (message) {
      return String(message.conversation_id) === String(conversationId) &&
        isDialogMessage(message) &&
        (anchorSeq === null || Number(message.seq) <= anchorSeq);
    })
    .sort(function (a, b) { return Number(a.seq) - Number(b.seq); });
  let selected = rows.slice(-HISTORY_LIMIT);

  /* 錨定訊息一定要是最後一則 user turn；限制或資料異常造成缺席時補回。 */
  if (anchor && isDialogMessage(anchor) &&
    String(anchor.conversation_id) === String(conversationId)) {
    const anchorId = String(anchor.id);
    const rest = selected.filter(function (message) { return String(message.id) !== anchorId; });
    const take = Math.max(0, HISTORY_LIMIT - 1);
    selected = (take > 0 ? rest.slice(-take) : []).concat(anchor);
  }

  return selected
    .map(function (message) {
      return {
        role: message.sender_id === "ai" ? "assistant" : "user",
        text: redactText(messageLine(message))
      };
    })
    .filter(function (message) { return message.text !== ""; });
}

function draftSummary(draft) {
  if (!draft || typeof draft !== "object") return null;
  const out = {};
  DRAFT_KEYS.forEach(function (key) {
    if (draft[key] === undefined || draft[key] === null || draft[key] === "") return;
    out[key] = draft[key];
  });
  return out;
}

function productBrief(id) {
  const product = findById("products", String(id));
  if (!product) return { id: String(id) };
  return {
    id: String(id),
    fish_species: product.fish_species || "",
    condition: product.condition || "",
    price: Number(product.price) || 0,
    region: product.region || ""
  };
}

/* context 只留模型需要的欄位；照片、電話、地址與其他前端狀態一律不送。 */
function contextSummary(context) {
  const source = context && typeof context === "object" && !Array.isArray(context) ? context : {};
  const out = {};
  if (source.mode) out.mode = oneLine(source.mode).slice(0, 20);
  const draft = draftSummary(source.draft);
  if (draft) out.draft = draft;
  if (Array.isArray(source.last_cards)) {
    out.last_cards = source.last_cards.slice(0, 5).map(productBrief);
  }
  if (source.selected_product_id) out.selected_product_id = String(source.selected_product_id);
  if (source.editing && source.editing.slot) out.editing = { slot: String(source.editing.slot) };
  /* listing context 的修正歷史、使用者確認字串與待同意縮短版，只送模型需要的欄位。 */
  if (Array.isArray(source.correction_history)) {
    out.correction_history = source.correction_history.slice(-20);
  }
  if (Array.isArray(source.protected_names)) {
    out.protected_names = source.protected_names.slice(-20);
  }
  if (source.condition_proposal) out.condition_proposal = String(source.condition_proposal).slice(0, 60);
  if (Number.isInteger(source.condition_ask_count)) out.condition_ask_count = source.condition_ask_count;
  /* 白名單欄位裡的每個字串都套用同一套遮蔽規則，含草稿與商品摘要。 */
  return redactFields(out);
}

module.exports = {
  historyFor: historyFor,
  contextSummary: contextSummary
};
