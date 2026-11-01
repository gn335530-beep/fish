/* 交易房：由商品開啟（或沿用）買家與釣客唯一的房間與訂單草稿。 */

const express = require("express");
const { all, findById, patch } = require("../lib/store");
const { requireUser, publicUser } = require("../lib/auth");
const { productAvailability } = require("../lib/product-stock");
const { systemMessage } = require("../lib/messages");
const { sweepExpired } = require("../lib/timeouts");
const { summary } = require("../lib/conversations");
const deals = require("../lib/deals");
const dealItems = require("../lib/deal-items");
const { CANCELLED_STATUS } = require("../lib/deal-statuses");
const { ok, fail } = require("../lib/http");

const router = express.Router();

function peerOf(deal, userId) {
  const isBuyer = deals.isBuyer(deal, userId);
  const peerId = isBuyer ? deal.seller_id : deal.buyer_id;
  return publicUser(findById("users", peerId)) || {
    id: Number(peerId),
    display_name: "對方",
    username: "",
    rating_score: 0,
    review_count: 0
  };
}

function forUser(deal, userId) {
  const data = deals.decorateDeal(deal);
  const status = data.review_status || {};
  const isBuyer = deals.isBuyer(deal, userId);
  return Object.assign(data, {
    role: isBuyer ? "buyer" : "seller",
    peer: peerOf(deal, userId),
    my_reviewed: isBuyer ? !!status.buyer_reviewed : !!status.seller_reviewed,
    peer_reviewed: isBuyer ? !!status.seller_reviewed : !!status.buyer_reviewed
  });
}

function historyRow(deal, userId) {
  const data = forUser(deal, userId);
  return {
    id: data.id,
    conversation_id: data.conversation_id,
    deal_status: data.deal_status,
    created_at: data.created_at,
    confirmed_at: data.confirmed_at || null,
    updated_at: data.updated_at || data.created_at,
    item_count: data.items.length,
    total_quantity: data.items.reduce(function (sum, item) {
      return sum + Number(item.quantity || 0);
    }, 0),
    items_total: data.items_total,
    final_price: data.deal_terms
      ? Number(data.deal_terms.final_price || 0)
      : Number(data.items_total || 0),
    review_status: data.review_status,
    role: data.role,
    my_reviewed: data.my_reviewed,
    peer_reviewed: data.peer_reviewed,
    peer: data.peer
  };
}

router.post("/api/deals/initiate-channel", requireUser, function (req, res) {
  const body = req.body || {};
  const product = findById("products", body.product_id);
  if (!product) {
    fail(res, 404, "PRODUCT_NOT_FOUND", "找不到商品");
    return;
  }
  if (String(product.seller_id) === String(req.user.id)) {
    fail(res, 400, "OWN_PRODUCT", "不能洽談自己上架的商品");
    return;
  }

  const stock = productAvailability(product.id);
  let conversation = deals.findConversation(req.user.id, product.seller_id);
  let deal = conversation ? deals.draftOf(conversation.id) : null;

  /* 草稿不保留庫存，但同一筆草稿加起來不得超過目前可售。 */
  const quantity = dealItems.requireAddableQuantity(deal, stock, body.quantity, res, "可售尾數不足");
  if (quantity === null) return;

  const now = new Date().toISOString();
  const createdRoom = !conversation;

  if (!conversation) {
    conversation = deals.createConversation(req.user.id, product.seller_id, now);
  } else if (conversation.mode !== "HUMAN") {
    conversation = patch("conversations", conversation.id, { mode: "HUMAN" });
  }

  if (!deal) deal = deals.createDeal(conversation, req.user.id, now);
  if (createdRoom) systemMessage(conversation.id, "已進入交易洽談。");
  deal = dealItems.addWithMessage(deal, stock, quantity);
  conversation = findById("conversations", conversation.id);

  ok(res, {
    conversation: summary(conversation, req.user),
    deal: deals.decorateDeal(deal),
    product: stock.decorated
  }, "已開啟交易房");
});

router.get("/api/deals", requireUser, function (req, res) {
  sweepExpired();
  const userId = req.user.id;
  const rows = all("deals")
    .filter(function (deal) { return deals.isParticipant(deal, userId); })
    .sort(function (a, b) {
      return new Date(b.confirmed_at || b.created_at) - new Date(a.confirmed_at || a.created_at);
    })
    .map(function (deal) { return historyRow(deal, userId); });
  ok(res, rows, "取得交易紀錄成功");
});

router.get("/api/deals/:id", requireUser, function (req, res) {
  sweepExpired();
  const deal = deals.requireDeal(req, res);
  if (!deal) return;
  ok(res, forUser(deal, req.user.id), "取得訂單成功");
});

router.post("/api/deals/reinitiate", requireUser, function (req, res) {
  sweepExpired();
  const source = deals.requireDeal(req, res);
  if (!source) return;
  if (!deals.isBuyer(source, req.user.id)) {
    fail(res, 403, "FORBIDDEN", "只有買家可以重新發起協議");
    return;
  }
  if (source.deal_status !== CANCELLED_STATUS) {
    fail(res, 409, "INVALID_DEAL_STATUS", "只有已取消的訂單可以重新發起");
    return;
  }
  if (source.cancel_reason !== "OTHER") {
    fail(res, 409, "INVALID_DEAL_STATUS", "只有使用者取消的訂單可以重新發起");
    return;
  }

  const result = deals.reinitiateDeal(source, req.user.id, new Date().toISOString());
  if (result.error === "DRAFT_EXISTS") {
    fail(res, 409, "DRAFT_EXISTS", "已經有進行中的草稿訂單");
    return;
  }
  if (result.error === "NO_AVAILABLE_ITEMS") {
    fail(res, 409, "NO_AVAILABLE_ITEMS", "目前沒有可重新發起的商品");
    return;
  }
  if (result.error) {
    fail(res, 404, result.error, "找不到對話");
    return;
  }

  ok(res, {
    deal: deals.decorateDeal(result.deal),
    skipped: (result.skipped || []).map(function (item) {
      return { product_id: item.product_id, title: item.title };
    })
  }, "已重新發起交易");
});

module.exports = router;
