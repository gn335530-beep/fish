/* 啟動時修正既有商品資料：移除示意行情，並把舊的「冷凍」處理方式改成「放血冰鎮」。
   只處理 2026-10-27 前建立的商品，之後釣客自己輸入的「冷凍」不會被改寫。 */

const { all, setAll } = require("./store");
const { buildTitle } = require("./product-title");

const CONDITION_CUTOFF = Date.parse("2026-10-27T00:00:00+08:00");

function isLegacy(product) {
  if (!product.created_at) return true;
  const time = Date.parse(product.created_at);
  return !Number.isFinite(time) || time < CONDITION_CUTOFF;
}

function migrateProducts() {
  const migrated = new Map();
  let changed = false;
  const rows = all("products").map(function (product) {
    const next = Object.assign({}, product);
    let touched = false;
    if (Object.prototype.hasOwnProperty.call(next, "market_reference_price")) {
      delete next.market_reference_price;
      touched = true;
    }
    if (next.condition === "冷凍" && isLegacy(next)) {
      const oldTitle = next.title;
      next.condition = "放血冰鎮";
      next.title = buildTitle(next.fish_species, next.weight_kg, next.quantity, next.condition);
      migrated.set(next.id, {
        oldTitle: oldTitle,
        newTitle: next.title,
        fish_species: next.fish_species,
        weight_kg: next.weight_kg,
        quantity: next.quantity
      });
      touched = true;
    }
    if (touched) changed = true;
    return touched ? next : product;
  });
  if (changed) setAll("products", rows);
  return migrated;
}

/* 只認得被改寫商品的上架訊息所在房間，避免動到其它對話。 */
function listingConversations(messages, migrated) {
  const ids = new Set();
  for (const message of messages) {
    if (message.card && message.card.type === "product" && migrated.has(message.card.product_id)) {
      ids.add(message.conversation_id);
    }
    for (const info of migrated.values()) {
      if (message.text === info.oldTitle || message.text === "已上架：" + info.oldTitle) {
        ids.add(message.conversation_id);
      }
    }
  }
  return ids;
}

function matchesDraft(draft, info) {
  if (!draft || draft.condition !== "冷凍") return false;
  if (draft.fish_species !== info.fish_species) return false;
  if (draft.weight_kg !== undefined && Number(draft.weight_kg) !== Number(info.weight_kg)) return false;
  if (draft.quantity !== undefined && Number(draft.quantity) !== Number(info.quantity)) return false;
  return true;
}

function migrateMessages(migrated, conversations) {
  let changedCount = 0;
  const rows = all("messages").map(function (message) {
    const next = Object.assign({}, message);
    let touched = false;

    if (next.card && next.card.type === "draft" && conversations.has(next.conversation_id)) {
      for (const info of migrated.values()) {
        if (matchesDraft(next.card.draft, info)) {
          next.card = Object.assign({}, next.card, {
            draft: Object.assign({}, next.card.draft, { condition: "放血冰鎮" })
          });
          touched = true;
        }
      }
    }

    if (next.card && next.card.type === "product" && migrated.has(next.card.product_id)) {
      const info = migrated.get(next.card.product_id);
      next.card = Object.assign({}, next.card, { condition: "放血冰鎮", title: info.newTitle });
      touched = true;
    }

    if (typeof next.text === "string" && next.text) {
      for (const info of migrated.values()) {
        if (next.text === info.oldTitle) {
          next.text = info.newTitle;
          touched = true;
        } else if (next.text === "已上架：" + info.oldTitle) {
          next.text = "已上架：" + info.newTitle;
          touched = true;
        }
      }
      if (next.text === "冷凍" && conversations.has(next.conversation_id)) {
        next.text = "放血冰鎮";
        touched = true;
      }
    }

    if (!touched) return message;
    changedCount += 1;
    return next;
  });
  if (changedCount > 0) setAll("messages", rows);
  return changedCount;
}

function normalizeProductData() {
  const messages = all("messages");
  const migrated = migrateProducts();
  if (migrated.size === 0) return { products: 0, messages: 0 };
  const conversations = listingConversations(messages, migrated);
  const changed = migrateMessages(migrated, conversations);
  return { products: migrated.size, messages: changed };
}

module.exports = { normalizeProductData: normalizeProductData };
