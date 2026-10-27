/* 房間切換：載入訊息、標記已讀、新增助手房與刪除。 */

import { state, update, emptyProposal } from "./store.js";
import * as api from "./api.js";

export function viewOf(room) {
  return room && room.type === "deal" ? "deal" : "assistant";
}

export function currentRoom() {
  if (!state.room) return null;
  return (state.conversations || []).find(function (item) {
    return item.id === state.room.id;
  }) || state.room;
}

export function clearUnread(conversations, roomId) {
  return (conversations || []).map(function (item) {
    return item.id === roomId ? Object.assign({}, item, { unread_count: 0 }) : item;
  });
}

function assistantsOf(conversations) {
  return (conversations || []).filter(function (item) {
    return item.type === "assistant";
  });
}

export function latestAssistant(conversations) {
  return assistantsOf(conversations)[0] || null;
}

async function loadDeal(deal) {
  if (!deal) return null;
  try {
    return await api.getDeal(deal.id);
  } catch (error) {
    return null;
  }
}

export async function openRoom(room) {
  const messages = await api.listMessages(room.id, 0);
  const last = messages[messages.length - 1];
  const deal = room.type === "deal" && room.order ? await loadDeal(room.order) : null;
  update({
    room: room,
    messages: messages,
    lastSeq: last ? Number(last.seq) : 0,
    view: viewOf(room),
    deal: deal,
    dealOpen: true,
    addonOpen: false,
    addons: [],
    addonQty: {},
    proposeOpen: false,
    proposal: emptyProposal(),
    cancelReasons: {},
    reviewDrafts: {}
  });
  await api.markRead(room.id);
  update({ conversations: clearUnread(state.conversations, room.id) });
  return room;
}

/* 登入時只在完全沒有助手房時建立；否則開啟最近一間。 */
export async function ensureAssistantRoom() {
  const conversations = await api.listConversations();
  update({ conversations: conversations });
  const assistants = assistantsOf(conversations);
  if (!assistants.length) return createAssistantRoom();
  return openRoom(latestAssistant(conversations));
}

export async function createAssistantRoom() {
  const created = await api.createAssistant();
  const conversations = await api.listConversations();
  update({ conversations: conversations });
  const room = (conversations || []).find(function (item) {
    return item.id === created.id;
  }) || created;
  return openRoom(room);
}

export function roomLabel(room) {
  return room && room.type === "deal" ? "交易房" : "助手房";
}

/* 刪除目前房間後，切到下一間助手房；沒有就回到空狀態，不自動補一間。 */
export async function deleteConversation(conversationId, options) {
  const target = (state.conversations || []).find(function (item) {
    return item.id === conversationId;
  }) || (state.room && state.room.id === conversationId ? state.room : null);
  const label = roomLabel(target);
  if (!(options && options.confirm === false) && window.confirm && !window.confirm("確定刪除" + label + "？")) {
    return false;
  }
  await api.deleteConversation(conversationId);
  const conversations = await api.listConversations();
  update({ conversations: conversations });

  if (!state.room || state.room.id !== conversationId) return true;
  const assistants = assistantsOf(conversations);
  if (assistants.length) {
    await openRoom(assistants[0]);
    return true;
  }
  update({
    room: null,
    messages: [],
    lastSeq: 0,
    view: conversations.length ? "inbox" : "assistant"
  });
  return true;
}
