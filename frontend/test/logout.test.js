/* 登出：清除本機 Token、會員資料與助手狀態，重新載入頁面不會又自動登入。 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

import { state, update } from "../assets/js/demo/store.js";
import { clearSession } from "../assets/js/demo/session.js";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const clientSource = read("../assets/js/api/client.js");
const authSource = read("../assets/js/api/auth.js");
const accountSource = read("../assets/js/app/02-account.js");
const initSource = read("../assets/js/app/08-api-init.js");
const drawerSource = read("../assets/js/app/06-drawer.js");
const loginSource = read("../assets/js/pages/login.js");

function createStorage(initial) {
  const data = new Map(Object.entries(initial || {}));
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); }
  };
}

function loggedInStorage() {
  return createStorage({
    haisen_token_v1: "token-123",
    haisen_user_v1: JSON.stringify({ nick: "阿海", phone: "0912345678" }),
    haisen_avatar_v1: "data:image/png;base64,abc",
    haisen_region_v1: "基隆市"
  });
}

function contextWithAccount(storage) {
  const ctx = vm.createContext({
    window: {},
    localStorage: storage,
    document: {
      getElementById() { return null; },
      addEventListener() {}
    }
  });
  vm.runInContext(clientSource, ctx);
  vm.runInContext(authSource, ctx);
  vm.runInContext(accountSource, ctx);
  return ctx;
}

test("登出會清除 Token、會員資料與頭像，但保留地區偏好", function () {
  const storage = loggedInStorage();
  const ctx = contextWithAccount(storage);

  vm.runInContext("logoutUser()", ctx);

  assert.equal(storage.getItem("haisen_token_v1"), null);
  assert.equal(storage.getItem("haisen_user_v1"), null);
  assert.equal(storage.getItem("haisen_avatar_v1"), null);
  assert.equal(storage.getItem("haisen_region_v1"), "基隆市");
  /* 下次載入時 syncSessionFromApi() 沒有 Token 就不會再自動登入。 */
  assert.equal(vm.runInContext("window.HaisenAPI.getToken()", ctx), "");
  assert.equal(vm.runInContext("getUser()", ctx), null);
});

test("損壞的會員快取不會讓頁面崩潰，並會被清掉", function () {
  const storage = createStorage({ haisen_user_v1: "{bad json" });
  const ctx = contextWithAccount(storage);

  assert.equal(vm.runInContext("getUser()", ctx), null);
  assert.equal(storage.getItem("haisen_user_v1"), null);
});

test("登入狀態在重整後仍保留，登出後清除", function () {
  const storage = loggedInStorage();
  const first = contextWithAccount(storage);
  assert.equal(vm.runInContext("getUser().nick", first), "阿海");

  /* 模擬重新載入：同一個 localStorage 重新建立模組環境。 */
  const reloaded = contextWithAccount(storage);
  assert.equal(vm.runInContext("getUser().nick", reloaded), "阿海");
  vm.runInContext("logoutUser()", reloaded);

  assert.equal(storage.getItem("haisen_token_v1"), null);
  assert.equal(storage.getItem("haisen_user_v1"), null);
});

test("登入狀態的儲存 key 只由 api/client.js 讀寫", function () {
  [accountSource, initSource, drawerSource, authSource, loginSource].forEach(function (source) {
    assert.doesNotMatch(source, /haisen_token_v1|haisen_user_v1/);
  });
});

test("沒有 Token 但有舊會員資料時，載入頁面會清掉登入狀態", async function () {
  const storage = createStorage({
    haisen_user_v1: JSON.stringify({ nick: "阿海", phone: "0912345678" })
  });
  const ctx = contextWithAccount(storage);
  vm.runInContext(initSource, ctx);

  await vm.runInContext("syncSessionFromApi()", ctx);

  assert.equal(storage.getItem("haisen_user_v1"), null);
  assert.equal(storage.getItem("haisen_token_v1"), null);
});

test("導覽選單與個人抽屜的登出鈕都走同一條登出流程", function () {
  assert.match(accountSource, /function logoutUser\(/);
  assert.match(accountSource, /window\.FishMatchBot\.logout/);
  assert.match(drawerSource, /logoutUser\(\)/);
  assert.doesNotMatch(drawerSource, /setUser\(null\)/);
});

test("助手登出會清掉房間、訊息與會員狀態，並收起面板", function () {
  update({
    user: { id: 1, nick: "阿海" },
    conversations: [{ id: "c1" }],
    room: { id: "c1", type: "deal" },
    messages: [{ id: "m1" }],
    lastSeq: 5,
    view: "deal",
    notice: "錯誤"
  });
  let closed = false;

  clearSession({ close() { closed = true; } });

  assert.equal(state.user, null);
  assert.deepEqual(state.conversations, []);
  assert.equal(state.room, null);
  assert.deepEqual(state.messages, []);
  assert.equal(state.lastSeq, 0);
  assert.equal(state.view, "assistant");
  assert.equal(state.notice, "");
  assert.equal(state.proposal.final_price, "");
  assert.equal(closed, true);
});
