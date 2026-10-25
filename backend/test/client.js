/* 測試用伺服器：每個測試檔一份暫存 db.json，啟動 app 並登入測試帳號。 */

const { createDb } = require("./fixture");

process.env.FISHMATCH_DB = createDb();
const app = require("../app");

let server = null;
let base = "";
const tokens = {};

async function call(method, suffix, options) {
  const opts = options || {};
  const headers = {};
  if (opts.token) headers.Authorization = "Bearer " + opts.token;
  if (opts.body) headers["Content-Type"] = "application/json";
  const response = await fetch(base + suffix, {
    method: method,
    headers: headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  return { status: response.status, body: await response.json() };
}

async function start() {
  await new Promise(function (resolve) {
    server = app.listen(0, resolve);
  });
  base = "http://127.0.0.1:" + server.address().port;

  const accounts = [
    ["buyer", "0922222222", 2],
    ["seller", "0911111111", 1],
    ["third", "0933333333", 3],
    ["otherSeller", "0944444444", 4]
  ];
  for (const account of accounts) {
    const result = await call("POST", "/api/auth/login", {
      body: { username: account[1], password: "pw" + account[2] }
    });
    tokens[account[0]] = result.body.data.token;
  }
}

function stop() {
  if (server) server.close();
}

module.exports = { start: start, stop: stop, call: call, tokens: tokens };
