/* 每次 e2e 都從 seed 重建測試資料庫，避免測試互相污染或動到開發資料。 */

const fs = require("node:fs");
const path = require("node:path");

const DB_FILE = process.env.FISHMATCH_DB ||
  path.join(__dirname, "..", ".data", "db.json");
const SEED_FILE = path.join(__dirname, "..", "..", "backend", "db.seed.json");

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
fs.copyFileSync(SEED_FILE, DB_FILE);

process.env.FISHMATCH_DB = DB_FILE;
process.env.PORT = process.env.PORT || "3101";

require("../../backend/server.js");
