/* 靜態伺服器：只能提供根目錄內的檔案，不能靠 .. 或同前綴目錄逃逸。 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import serve from "../../tools/serve-frontend.js";

function makeTree() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "fishmatch-web-"));
  const root = path.join(base, "frontend");
  fs.mkdirSync(path.join(root, "sub"), { recursive: true });
  fs.mkdirSync(path.join(base, "frontend-evil"), { recursive: true });
  fs.writeFileSync(path.join(root, "index.html"), "root-index");
  fs.writeFileSync(path.join(root, "sub", "index.html"), "sub-index");
  fs.writeFileSync(path.join(root, "safe.txt"), "safe");
  fs.writeFileSync(path.join(root, "..safe.txt"), "dotdot-safe");
  fs.writeFileSync(path.join(base, "package.json"), "secret");
  fs.writeFileSync(path.join(base, "frontend-evil", "secret.txt"), "secret");
  return root;
}

function startServer(root) {
  const server = serve.createServer(root);
  return new Promise(function (resolve) {
    server.listen(0, "127.0.0.1", function () {
      resolve({ server: server, port: server.address().port });
    });
  });
}

function rawGet(port, rawPath) {
  return new Promise(function (resolve, reject) {
    const request = http.request({
      host: "127.0.0.1", port: port, path: rawPath, method: "GET"
    }, function (response) {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", function (chunk) { body += chunk; });
      response.on("end", function () {
        resolve({ status: response.statusCode, body: body });
      });
    });
    request.on("error", reject);
    request.end();
  });
}

test("正常檔案與目錄 index 可以取得", async function () {
  const root = makeTree();
  const started = await startServer(root);
  try {
    assert.deepEqual(await rawGet(started.port, "/"), { status: 200, body: "root-index" });
    assert.deepEqual(await rawGet(started.port, "/sub/"), { status: 200, body: "sub-index" });
    assert.deepEqual(await rawGet(started.port, "/safe.txt"), { status: 200, body: "safe" });
    assert.deepEqual(await rawGet(started.port, "/..safe.txt"), { status: 200, body: "dotdot-safe" });
  } finally {
    await new Promise(function (resolve) { started.server.close(resolve); });
    fs.rmSync(path.dirname(root), { recursive: true, force: true });
  }
});

test(".. 與同前綴目錄都不能逃出根目錄", async function () {
  const root = makeTree();
  const started = await startServer(root);
  try {
    assert.equal((await rawGet(started.port, "/../package.json")).status, 403);
    assert.equal((await rawGet(started.port, "/../frontend-evil/secret.txt")).status, 403);
    assert.equal((await rawGet(started.port, "/%2e%2e/package.json")).status, 403);
    assert.equal((await rawGet(started.port, "/%00safe.txt")).status, 403);
    assert.equal((await rawGet(started.port, "/%E0%A4%A")).status, 403);
  } finally {
    await new Promise(function (resolve) { started.server.close(resolve); });
    fs.rmSync(path.dirname(root), { recursive: true, force: true });
  }
});
