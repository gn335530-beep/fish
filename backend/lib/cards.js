/* 協議與評價卡片：只更新同一筆訂單中 seq 最大的最新卡片，較早的卡留作歷史。 */

const { all, patch } = require("./store");

function syncLatestCard(dealId, type, changes) {
  const cards = all("messages").filter(function (message) {
    return message.card && message.card.type === type
      && String(message.card.deal_id) === String(dealId);
  });
  cards.sort(function (a, b) { return Number(b.seq) - Number(a.seq); });
  if (!cards.length) return null;
  return patch("messages", cards[0].id, {
    card: Object.assign({}, cards[0].card, changes)
  });
}

module.exports = { syncLatestCard: syncLatestCard };
