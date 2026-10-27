/* 執行時資料庫檔：不存在時從可提交的種子複製，已存在時保留開發資料。 */

const fs = require("node:fs");
const path = require("node:path");

function ensureDatabase(dbFile, seedFile) {
  if (fs.existsSync(dbFile)) return false;
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  fs.copyFileSync(seedFile, dbFile);
  return true;
}

module.exports = { ensureDatabase: ensureDatabase };
