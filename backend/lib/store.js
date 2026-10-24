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
  db().get(collection).push(row).write();
  return row;
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
  patch: patch,
  remove: remove,
  nextCode: nextCode,
  nextNumericId: nextNumericId,
  nextSeq: nextSeq
};
