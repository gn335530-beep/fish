/* 行情抓取快取：範圍快取、TTL 與 negative cache 判斷。 */

const repository = require("./repository");
const { todayIso } = require("./dates");

const TTL_MS = 30 * 60 * 1000;
const rangeCache = new Map();

function isFresh(isoText) {
  const time = Date.parse(isoText || "");
  return Number.isFinite(time) && Date.now() - time < TTL_MS;
}

function key(code, from, to) {
  return code + "|" + (from || "") + "|" + (to || "");
}

function entry(code) {
  return rangeCache.get(code);
}

function covers(cachedEntry, from, to) {
  if (!cachedEntry || !isFresh(cachedEntry.at)) return false;
  return cachedEntry.from <= from && cachedEntry.to >= to;
}

function result(status) {
  return { status: status || "ok", rows: [], cached: true };
}

/* 過去日期一旦抓過就不應再改；含今天的範圍仍受 30 分鐘 TTL 限制。 */
function stateCovers(state, from, to) {
  if (!state || state.last_status === "error") return false;
  if (!state.last_range_from || !state.last_range_to) return false;
  if (state.last_range_from > from || state.last_range_to < to) return false;
  return to < todayIso() || isFresh(state.last_checked_at);
}

/* 狀態說「抓成功」時，本機必須真的還有對應範圍的資料，否則視為失效。 */
function hasBackingData(state, mapping, from, to) {
  if (!state || state.last_status !== "ok") return true;
  return repository.hasPricesInCodeRange(mapping.code, from, to);
}

function hasRangeData(cachedEntry, mapping, from, to) {
  if (!cachedEntry) return false;
  if (cachedEntry.status !== "ok") return true;
  return repository.hasPricesInCodeRange(mapping.code, from, to);
}

function remember(code, from, to, at, status) {
  rangeCache.set(code, { from: from, to: to, at: at, status: status });
}

function reset() {
  rangeCache.clear();
}

module.exports = {
  TTL_MS: TTL_MS,
  isFresh: isFresh,
  key: key,
  entry: entry,
  covers: covers,
  result: result,
  stateCovers: stateCovers,
  hasBackingData: hasBackingData,
  hasRangeData: hasRangeData,
  remember: remember,
  reset: reset
};
