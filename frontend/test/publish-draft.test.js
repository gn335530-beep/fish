/* 草稿發布：立即回饋、連點只送一次、失敗恢復與重試識別碼。 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  NOTICE, PRODUCT, createGate, failNextAiMessage, hasNotice, setupPublishTest
} from "./publish-fixtures.js";

const publish = await setupPublishTest();
const editing = await import("../assets/js/demo/ai/editing.js");
const store = publish.store;
const flow = publish.flow;
const assistantView = publish.assistantView;
const harness = publish.harness;

function assertActionsDisabled(html) {
  ["publish", "edit-draft", "cancel-listing"].forEach(function (action) {
    assert.match(html, new RegExp('data-action="' + action + '"[^>]*disabled'));
  });
}

test("連點確認上架只送出一次建立商品請求，並顯示上架中", async function () {
  const gate = createGate();
  publish.reset();
  harness.createHandler = async function () {
    await gate.promise;
    return { data: PRODUCT };
  };

  const first = flow.publishDraft();
  const second = flow.publishDraft();

  assert.equal(store.state.publishing, true);
  assert.equal(harness.createCalls.length, 1);
  const busyHtml = assistantView.renderAssistant();
  assert.match(busyHtml, /上架中…/);
  assert.doesNotMatch(busyHtml, /確認上架/);
  assertActionsDisabled(busyHtml);
  assert.match(busyHtml, /aria-busy="true"/);

  gate.release();
  await first;
  await second;

  assert.equal(harness.createCalls.length, 1);
  assert.equal(store.state.publishing, false);
  assert.equal(store.state.room.context.draft, null);
  const doneHtml = assistantView.renderAssistant();
  assert.ok(hasNotice(doneHtml));
  assert.doesNotMatch(doneHtml, /上架草稿/);
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

test("建立成功但訊息寫入失敗後，修改草稿再重試仍用同一識別碼", async function () {
  publish.reset();
  const restore = failNextAiMessage();

  try {
    await flow.publishDraft();
    assert.equal(harness.createCalls.length, 1);
    assert.equal(harness.notifyError.message, "訊息寫入失敗");
    assert.equal(store.state.room.context.draft.quantity, 2);

    const edited = editing.chooseEditField(store.state.room.context, "尾數改成 3 尾");
    assert.equal(edited.context.draft.quantity, 3);
    assert.equal(edited.context.draft.client_request_id, harness.createCalls[0].client_request_id);
    publish.setDraft(edited.context.draft);

    await flow.publishDraft();
    assert.equal(harness.createCalls.length, 2);
    assert.equal(harness.createCalls[1].quantity, 3);
    assert.equal(harness.createCalls[1].client_request_id, harness.createCalls[0].client_request_id);
    assert.ok(hasNotice(assistantView.renderAssistant()));
  } finally {
    restore();
  }
});
