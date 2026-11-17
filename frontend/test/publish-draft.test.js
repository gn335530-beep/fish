/* 草稿發布：立即回饋、連點只送一次、失敗恢復與重試識別碼。 */

import test from "node:test";
import assert from "node:assert/strict";
import { NOTICE, PRODUCT, setupPublishTest } from "./publish-fixtures.js";

const publish = await setupPublishTest();
const store = publish.store;
const flow = publish.flow;
const assistantView = publish.assistantView;
const harness = publish.harness;

test("連點確認上架只送出一次建立商品請求，並顯示上架中", async function () {
  let release;
  const gate = new Promise(function (resolve) { release = resolve; });
  publish.reset();
  harness.createHandler = async function () {
    await gate;
    return { data: PRODUCT };
  };

  const first = flow.publishDraft();
  const second = flow.publishDraft();

  assert.equal(store.state.publishing, true);
  assert.equal(harness.createCalls.length, 1);
  assert.match(assistantView.renderAssistant(), /上架中…/);
  assert.match(assistantView.renderAssistant(), /disabled/);

  release();
  await first;
  await second;

  assert.equal(harness.createCalls.length, 1);
  assert.equal(store.state.publishing, false);
  assert.equal(store.state.room.context.draft, null);
  assert.match(assistantView.renderAssistant(), /已上架：花枝（2尾 \/ 放血冰鎮）/);
  assert.doesNotMatch(assistantView.renderAssistant(), /上架草稿/);
  assert.deepEqual(harness.toasts, [NOTICE]);
  assert.deepEqual(harness.events, ["haisen:products-changed"]);
});

test("發布失敗時恢復按鈕、保留草稿並顯示錯誤", async function () {
  publish.reset();
  harness.createHandler = function () { throw new Error("後端壞了"); };

  await flow.publishDraft();

  assert.equal(store.state.publishing, false);
  assert.equal(harness.notifyError.message, "後端壞了");
  assert.deepEqual(harness.toasts, ["後端壞了"]);
  assert.equal(store.state.room.context.draft.quantity, 2);
  assert.match(assistantView.renderAssistant(), /確認上架/);
  assert.doesNotMatch(assistantView.renderAssistant(), /上架中…/);
});

test("建立成功但訊息寫入失敗後重試仍用同一識別碼", async function () {
  publish.reset();
  const originalRequest = globalThis.window.HaisenAPI.request;
  let failMessage = true;
  globalThis.window.HaisenAPI.request = async function (path, options) {
    const body = options && options.body;
    if (failMessage && path === "/api/chat/message" && body && body.sender_type === "ai") {
      failMessage = false;
      throw new Error("訊息寫入失敗");
    }
    return originalRequest(path, options);
  };

  try {
    await flow.publishDraft();
    assert.equal(harness.createCalls.length, 1);
    assert.equal(harness.notifyError.message, "訊息寫入失敗");
    assert.equal(store.state.room.context.draft.quantity, 2);

    await flow.publishDraft();
    assert.equal(harness.createCalls.length, 2);
    assert.match(harness.createCalls[0].client_request_id, /^pub_/);
    assert.equal(harness.createCalls[1].client_request_id, harness.createCalls[0].client_request_id);
    assert.match(assistantView.renderAssistant(), /已上架：/);
  } finally {
    globalThis.window.HaisenAPI.request = originalRequest;
  }
});
