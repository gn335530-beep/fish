/* 助手暫存縣市：按對話隔離、30 分鐘過期；只存記憶體，重啟後遺失。 */

const TTL_MS = 30 * 60 * 1000;
const store = new Map();

function timeOf(at) {
  return Number.isFinite(at) ? at : Date.now();
}

function rowOf(conversationId, at) {
  const key = String(conversationId);
  const row = store.get(key);
  if (!row) return null;
  if (row.expiresAt <= timeOf(at)) {
    store.delete(key);
    return null;
  }
  return row;
}

function rememberCity(conversationId, city, at) {
  const time = timeOf(at);
  store.set(String(conversationId), { city: city, pending: false, expiresAt: time + TTL_MS });
}

function cityOf(conversationId, at) {
  const row = rowOf(conversationId, at);
  return row ? row.city : "";
}

function markAsked(conversationId, at) {
  const key = String(conversationId);
  const time = timeOf(at);
  const row = rowOf(key, time) || { city: "" };
  store.set(key, { city: row.city, pending: true, expiresAt: time + TTL_MS });
}

function wasAsked(conversationId, at) {
  const row = rowOf(conversationId, at);
  return Boolean(row && row.pending);
}

function clearAsked(conversationId) {
  const key = String(conversationId);
  const row = store.get(key);
  if (row) row.pending = false;
}

function forget(conversationId) {
  store.delete(String(conversationId));
}

function clear() {
  store.clear();
}

module.exports = {
  TTL_MS: TTL_MS,
  rememberCity: rememberCity,
  cityOf: cityOf,
  markAsked: markAsked,
  wasAsked: wasAsked,
  clearAsked: clearAsked,
  forget: forget,
  clear: clear
};
