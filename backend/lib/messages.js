/* 對話訊息建立：系統訊息與卡片訊息共用 addMessage，並同步更新 last_message_at。 */

const { insert, patch, nextCode, nextSeq } = require("./store");

function addMessage(conversationId, fields) {
  const now = new Date().toISOString();
  const message = insert("messages", Object.assign({
    id: nextCode("messages", "msg"),
    seq: nextSeq("messages"),
    conversation_id: conversationId,
    image_url: null,
    card: null,
    created_at: now
  }, fields));
  patch("conversations", conversationId, { last_message_at: now });
  return message;
}

function systemMessage(conversationId, text) {
  return addMessage(conversationId, { sender_id: "system", type: "system", text: text });
}

function cardMessage(conversationId, senderId, card) {
  return addMessage(conversationId, {
    sender_id: senderId,
    type: "card",
    text: "",
    card: card
  });
}

module.exports = {
  addMessage: addMessage,
  systemMessage: systemMessage,
  cardMessage: cardMessage
};
