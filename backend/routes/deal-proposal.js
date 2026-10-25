/* 協議提案：整單金額、面交地點與時間；逐項檢查可售後鎖定 30 分鐘。 */

const express = require("express");
const { requireUser } = require("../lib/auth");
const { productAvailability, isActive, cardMessage, systemMessage, sweepExpired } = require("../lib/orders");
const { itemsOf, quantityOf } = require("../lib/deal-items");
const deals = require("../lib/deals");
const { ok, fail } = require("../lib/http");

const router = express.Router();

function parseTerms(body) {
  const finalPrice = Math.round(Number(body.final_price));
  const meetupLocation = String(body.meetup_location || "").trim();
  const meetupTime = String(body.meetup_time || "").trim();
  const when = new Date(meetupTime);

  if (!(finalPrice > 0)) return { code: "INVALID_PRICE", message: "整單金額必須大於 0 元" };
  if (!meetupLocation) return { code: "MISSING_TERMS", message: "請填寫面交地點" };
  if (meetupLocation.length > 100) return { code: "FIELD_TOO_LONG", message: "面交地點不可超過 100 字" };
  if (!meetupTime || isNaN(when.getTime())) return { code: "INVALID_MEETUP_TIME", message: "請填寫有效的面交時間" };

  return {
    terms: {
      final_price: finalPrice,
      meetup_location: meetupLocation,
      meetup_time: when.toISOString()
    }
  };
}

/* 回傳第一個可售不足的項目；重送時要扣掉這筆訂單自己的保留。 */
function shortageOf(deal) {
  const items = itemsOf(deal);
  for (const item of items) {
    const stock = productAvailability(item.product_id);
    const own = isActive(deal) ? quantityOf(deal, item.product_id) : 0;
    const available = (stock ? stock.available : 0) + own;
    if (Number(item.quantity) > available) return { item: item, available: available };
  }
  return null;
}

router.post("/api/deals/propose", requireUser, function (req, res) {
  sweepExpired();
  const deal = deals.requireDeal(req, res);
  if (!deal) return;

  const resending = deal.deal_status === "NEGOTIATING";
  if (!resending && deal.deal_status !== deals.DRAFT_STATUS) {
    fail(res, 409, "INVALID_DEAL_STATUS", "只有草稿或已退回的訂單可以送出協議");
    return;
  }
  if (resending && String(deal.rejected_by) !== String(req.user.id)) {
    fail(res, 403, "FORBIDDEN", "只有退回方可以重新送出協議");
    return;
  }

  const items = itemsOf(deal);
  if (!items.length) {
    fail(res, 400, "EMPTY_DEAL", "訂單沒有項目，無法送出協議");
    return;
  }

  const parsed = parseTerms(req.body || {});
  if (parsed.code) {
    fail(res, 400, parsed.code, parsed.message);
    return;
  }

  if (deals.hasActiveDeal(deal.conversation_id, deal.id)) {
    fail(res, 409, "DEAL_IN_PROGRESS", "這個交易房已有一筆進行中的協議");
    return;
  }

  const missing = shortageOf(deal);
  if (missing) {
    fail(res, 409, "INSUFFICIENT_QUANTITY",
      "「" + missing.item.title + "」可售 " + missing.available + " 尾，不足 " + missing.item.quantity + " 尾", {
        item_id: missing.item.item_id,
        product_id: missing.item.product_id,
        available: missing.available
      });
    return;
  }

  const now = new Date().toISOString();
  const updated = deals.applyProposal(deal, req.user.id, parsed.terms, now);

  const card = {
    type: "deal",
    deal_id: updated.id,
    status: "pending",
    initiator_id: Number(req.user.id),
    final_price: parsed.terms.final_price,
    meetup_location: parsed.terms.meetup_location,
    meetup_time: parsed.terms.meetup_time,
    items_total: updated.items_total,
    items: itemsOf(updated).map(function (item) {
      return { title: item.title, quantity: item.quantity, unit_price: item.unit_price };
    })
  };
  cardMessage(deal.conversation_id, Number(req.user.id), card);
  systemMessage(deal.conversation_id, "已送出協議，等待對方回覆（30 分鐘內）。");

  ok(res, { deal: deals.decorateDeal(updated) }, "協議已送出");
});

module.exports = router;
