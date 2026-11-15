/* json-server（lowdb）的資料存取集中層，其他模組不直接碰 db 物件。 */

let database = null;

function setDb(instance) {
  database = instance;
}

function db() {
  if (!database) throw new Error("store 尚未初始化");
  return database;
}

function all(collection) {
  return db().get(collection).value() || [];
}

function findById(collection, id) {
  return all(collection).find(function (row) { return String(row.id) === String(id); }) || null;
}

function insert(collection, row) {
  if (!Array.isArray(db().get(collection).value())) db().set(collection, []).write();
  db().get(collection).push(row).write();
  return row;
}

/* 整批取代唯讀對照表；重啟時用它讓 db 與程式內建對照保持一致。 */
function setAll(collection, rows) {
  db().set(collection, rows).write();
  return rows;
}

function dropCollection(collection) {
  db().unset(collection).write();
}

function patch(collection, id, changes) {
  db().get(collection).find({ id: id }).assign(changes).write();
  return findById(collection, id);
}

function remove(collection, id) {
  db().get(collection).remove({ id: id }).write();
}

function pad3(n) {
  return String(n).padStart(3, "0");
}

function todayCode() {
  const local = new Date(Date.now() + 8 * 3600 * 1000);
  return local.toISOString().slice(0, 10).replace(/-/g, "");
}

/* 產生 prd_20261024_001 這種可讀的流水號。 */
function nextCode(collection, prefix) {
  const base = prefix + "_" + todayCode() + "_";
  const max = all(collection).reduce(function (m, row) {
    const id = String(row.id || "");
    if (id.indexOf(base) !== 0) return m;
    return Math.max(m, Number(id.slice(base.length)) || 0);
  }, 0);
  return base + pad3(max + 1);
}

/* 硬刪後仍不重用 ID：每日流水號另存於 counters，只保留數字。 */
function nextStableCode(collection, prefix) {
  const day = todayCode();
  const base = prefix + "_" + day + "_";
  const existingMax = all(collection).reduce(function (m, row) {
    const id = String(row.id || "");
    if (id.indexOf(base) !== 0) return m;
    return Math.max(m, Number(id.slice(base.length)) || 0);
  }, 0);
  const key = collection + "_" + day;
  const counter = findById("counters", key);
  const next = Math.max(existingMax, Number(counter && counter.value) || 0) + 1;
  if (counter) patch("counters", key, { value: next });
  else insert("counters", { id: key, value: next });
  return base + pad3(next);
}

function nextProductCode() {
  return nextStableCode("products", "prd");
}

/* 硬刪房間時把當日計數器推到至少該序號，避免舊資料引用被新 ID 撞上。 */
function bumpStableCode(collection, prefix, id) {
  const base = prefix + "_" + todayCode() + "_";
  const text = String(id || "");
  if (text.indexOf(base) !== 0) return;
  const key = collection + "_" + todayCode();
  const counter = findById("counters", key);
  const next = Math.max(Number(text.slice(base.length)) || 0, Number(counter && counter.value) || 0);
  if (counter) patch("counters", key, { value: next });
  else insert("counters", { id: key, value: next });
}

function nextNumericId(collection) {
  return all(collection).reduce(function (m, row) {
    return Math.max(m, Number(row.id) || 0);
  }, 0) + 1;
}

/* 訊息用單調遞增序號，輪詢時以此取增量，避免同毫秒時間戳漏訊息。 */
function nextSeq(collection) {
  return all(collection).reduce(function (m, row) {
    return Math.max(m, Number(row.seq) || 0);
  }, 0) + 1;
}

module.exports = {
  setDb: setDb,
  all: all,
  findById: findById,
  insert: insert,
  setAll: setAll,
  dropCollection: dropCollection,
  patch: patch,
  remove: remove,
  nextCode: nextCode,
  nextStableCode: nextStableCode,
  nextProductCode: nextProductCode,
  bumpStableCode: bumpStableCode,
  nextNumericId: nextNumericId,
  nextSeq: nextSeq
};
