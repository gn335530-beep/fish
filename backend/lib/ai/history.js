/* 對話歷史與 context 摘要：只把模型需要的欄位送出，卡片不送完整 JSON。 */

const { all, findById } = require("../store");
const { redactText, redactFields } = require("./redact");

const DRAFT_KEYS = [
  "fish_species", "species_code", "quantity", "condition", "price", "price_per_taijin"
];

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
  return oneLine(message.text);
}

/* 依 seq 取最近 limit 則使用者／助手訊息；系統、圖片與完整卡片 JSON 不送入。 */
function historyFor(conversationId, limit) {
  return all("messages")
    .filter(function (message) {
      return String(message.conversation_id) === String(conversationId) &&
        (message.type === "text" || message.type === "card") &&
        message.sender_id !== "system";
    })
    .sort(function (a, b) { return Number(a.seq) - Number(b.seq); })
    .slice(-limit)
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
  /* 白名單欄位裡的每個字串都套用同一套遮蔽規則，含草稿與商品摘要。 */
  return redactFields(out);
}

module.exports = {
  historyFor: historyFor,
  contextSummary: contextSummary
};
