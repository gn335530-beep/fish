/* 由個人資訊開交易房：方向固定為買家→被看的釣客；有商品才建立空草稿。 */

const { all, findById } = require("./store");
const { hasPublicProducts } = require("./product-stock");
const { systemMessage } = require("./messages");
const { summary } = require("./conversations");
const deals = require("./deals");
const { ACTIVE_ORDER } = require("./deal-statuses");

function activeDealOf(conversationId) {
  return all("deals")
    .filter(function (deal) {
      return String(deal.conversation_id) === String(conversationId)
        && ACTIVE_ORDER.indexOf(deal.deal_status) !== -1;
    })
    .sort(function (a, b) {
      return new Date(b.created_at) - new Date(a.created_at);
    })[0] || null;
}

function initiateProfileRoom(buyer, sellerId, now) {
  const seller = findById("users", sellerId);
  if (!seller) return { error: "USER_NOT_FOUND" };
  if (String(seller.id) === String(buyer.id)) return { error: "OWN_PROFILE" };

  const hasProducts = hasPublicProducts(seller.id);
  let conversation = deals.findConversation(buyer.id, seller.id);
  const createdRoom = !conversation;
  if (!conversation) conversation = deals.createConversation(buyer.id, seller.id, now);

  let deal = activeDealOf(conversation.id);
  /* 既有進行中訂單優先回傳；即使商品已全部下架，買家仍能回到唯讀訂單。 */
  if (!deal && hasProducts) deal = deals.createDeal(conversation, buyer.id, now);

  if (createdRoom) {
    systemMessage(conversation.id, deal ? "已進入交易洽談。" : "已開啟對話。");
  }
  conversation = findById("conversations", conversation.id);

  return {
    conversation: summary(conversation, buyer),
    deal: deal ? deals.decorateDeal(deal) : null,
    has_products: hasProducts
  };
}

module.exports = { initiateProfileRoom: initiateProfileRoom };
