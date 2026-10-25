/* 交易房：由商品開啟（或沿用）買家與釣客唯一的房間與訂單草稿。 */

const express = require("express");
const { all, findById, patch } = require("../lib/store");
const { requireUser } = require("../lib/auth");
const { decorateProduct, itemsOf, systemMessage, sweepExpired } = require("../lib/orders");
const { summary } = require("../lib/conversations");
const deals = require("../lib/deals");
const dealItems = require("../lib/deal-items");
const { ok, fail } = require("../lib/http");

const router = express.Router();

function peerOf(deal, userId) {
  const isBuyer = deals.isBuyer(deal, userId);
  const peerId = isBuyer ? deal.seller_id : deal.buyer_id;
  const peer = findById("users", peerId);
  return { id: Number(peerId), display_name: peer ? peer.display_name : "對方" };
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

  const quantity = Math.floor(Number(body.quantity));
  if (!(quantity >= 1)) {
    fail(res, 400, "INVALID_QUANTITY", "尾數必須大於等於 1");
    return;
  }

  const decorated = decorateProduct(product, all("deals"));
  let conversation = deals.findConversation(req.user.id, product.seller_id);
  let deal = conversation ? deals.draftOf(conversation.id) : null;
  const inDraft = dealItems.quantityOf(deal, product.id);

  /* 草稿不保留庫存，但同一筆草稿加起來不得超過目前可售。 */
  if (inDraft + quantity > decorated.available) {
    fail(res, 409, "INSUFFICIENT_QUANTITY", "可售尾數不足", {
      product_id: product.id,
      available: decorated.available,
      in_draft: inDraft
    });
    return;
  }

  const now = new Date().toISOString();
  const createdRoom = !conversation;

  if (!conversation) {
    conversation = deals.createConversation(req.user.id, product.seller_id, now);
  } else if (conversation.mode !== "HUMAN") {
    conversation = patch("conversations", conversation.id, { mode: "HUMAN" });
  }

  if (!deal) deal = deals.createDeal(conversation, req.user.id, now);
  deal = dealItems.addItem(deal, decorated, quantity);

  if (createdRoom) systemMessage(conversation.id, "已進入交易洽談。");
  systemMessage(conversation.id, "已將「" + decorated.title + "」" + quantity + " 尾加入訂單草稿。");
  conversation = findById("conversations", conversation.id);

  ok(res, {
    conversation: summary(conversation, req.user),
    deal: deals.decorateDeal(deal),
    product: decorated
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

module.exports = router;
