/* 商品生命週期對訂單的副作用：移除草稿項目、取消洽談中協議、處理退回邊界。 */

const { all, findById } = require("./store");
const { itemsOf, writeItems } = require("./deal-items");
const { cancelDeal } = require("./deal-cancel");
const { systemMessage } = require("./messages");
const { DRAFT_STATUS } = require("./deal-statuses");

function labelOf(product) {
  return product.fish_species || product.title || "商品";
}

const LIFECYCLE_TEXT = {
  delisted: { word: "已下架", note: "商品已下架" },
  deleted: { word: "已刪除", note: "商品已刪除" }
};

function textOf(kind) {
  return LIFECYCLE_TEXT[kind] || LIFECYCLE_TEXT.delisted;
}

function hasProduct(deal, productId) {
  return itemsOf(deal).some(function (item) {
    return String(item.product_id) === String(productId);
  });
}

function cancelForProduct(deal, kind, operatorId, now) {
  const note = textOf(kind).note;
  return cancelDeal(deal, {
    operator: operatorId,
    reason: "OTHER",
    note: note,
    cardStatus: "cancelled",
    message: note + "，協議已取消。"
  }, now);
}

/* 從所有草稿訂單移除該商品，重算金額，並在交易房留下系統訊息。 */
function removeFromDrafts(product, kind) {
  let removed = 0;
  all("deals").filter(function (deal) {
    return deal.deal_status === DRAFT_STATUS && hasProduct(deal, product.id);
  }).forEach(function (deal) {
    const kept = itemsOf(deal).filter(function (item) {
      return String(item.product_id) !== String(product.id);
    });
    writeItems(deal, kept);
    systemMessage(deal.conversation_id,
      "「" + labelOf(product) + "」" + textOf(kind).word + "，已從訂單草稿移除。");
    removed += 1;
  });
  return removed;
}

/* 取消所有包含該商品的洽談中協議；等待確認的協議不動。 */
function cancelNegotiating(product, kind, operatorId, now) {
  let cancelled = 0;
  all("deals").filter(function (deal) {
    return deal.deal_status === "NEGOTIATING" && hasProduct(deal, product.id);
  }).forEach(function (deal) {
    cancelForProduct(deal, kind, operatorId, now);
    cancelled += 1;
  });
  return cancelled;
}

function applyProductLifecycle(product, kind, operatorId, now) {
  return {
    removed_drafts: removeFromDrafts(product, kind),
    cancelled_deals: cancelNegotiating(product, kind, operatorId, now)
  };
}

/* 待回覆協議中，只要任一商品已下架或已刪除，退回時直接取消。 */
function unavailableKind(deal) {
  const items = itemsOf(deal);
  for (const item of items) {
    if (!findById("products", item.product_id)) return "deleted";
  }
  for (const item of items) {
    const product = findById("products", item.product_id);
    if (product && product.delisted_at) return "delisted";
  }
  return null;
}

function cancelUnavailable(deal, operatorId, kind, now) {
  return cancelForProduct(deal, kind, operatorId, now);
}

module.exports = {
  applyProductLifecycle: applyProductLifecycle,
  unavailableKind: unavailableKind,
  cancelUnavailable: cancelUnavailable
};
