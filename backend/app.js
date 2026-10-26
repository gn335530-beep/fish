/* 後端組裝：CORS、body parser、靜態上傳目錄、自訂路由、json-server 預設路由。 */

const path = require("node:path");
const express = require("express");
const jsonServer = require("json-server");
const { setDb } = require("./lib/store");
const { seedMarketMappings } = require("./lib/market/bootstrap");
const { normalizeProductData } = require("./lib/product-data");

const DB_FILE = process.env.FISHMATCH_DB || path.join(__dirname, "db.json");

const app = jsonServer.create();
const router = jsonServer.router(DB_FILE);
setDb(router.db);
seedMarketMappings();
normalizeProductData();

app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(jsonServer.bodyParser);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(require("./routes/auth"));
app.use(require("./routes/products"));
app.use(require("./routes/species"));
app.use(require("./routes/chat"));
app.use(require("./routes/chat-messages"));
app.use(require("./routes/deals"));
app.use(require("./routes/deal-items"));
app.use(require("./routes/deal-proposal"));
app.use(require("./routes/deal-response"));
app.use(require("./routes/reviews"));
app.use(require("./routes/market"));
app.use(require("./routes/uploads"));

/* 只開放自訂的 /api 與 /uploads，避免直接以 json-server 預設路由改寫資料。 */
app.use(function (req, res) {
  res.status(404).json({ success: false, code: "NOT_FOUND", message: "找不到資源" });
});

module.exports = app;
