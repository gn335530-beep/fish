/* 草稿發布識別碼生命週期：新草稿、舊草稿補值與部分失敗重試。 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  failNextAiMessage, hasNotice, legacyDraft, setupPublishTest
} from "./publish-fixtures.js";

const publish = await setupPublishTest();
const draftApi = await import("../assets/js/demo/ai/draft.js");
const listingActions = await import("../assets/js/demo/listing-actions.js");
const store = publish.store;
const flow = publish.flow;
const assistantView = publish.assistantView;
const harness = publish.harness;

test("成功發布後建立新草稿，送出的識別碼與前一次不同", async function () {
  publish.reset();
  publish.setDraft(draftApi.mergeDraft(null, legacyDraft()));
  await flow.publishDraft();
  assert.equal(harness.createCalls.length, 1);
  const publishedId = harness.createCalls[0].client_request_id;
  assert.match(publishedId, /^pub_/);
  assert.equal(store.state.room.context.draft, null);

  publish.setDraft(draftApi.mergeDraft(null, legacyDraft()));
  await flow.publishDraft();

  assert.equal(harness.createCalls.length, 2);
  assert.notEqual(harness.createCalls[1].client_request_id, publishedId);
  assert.ok(hasNotice(assistantView.renderAssistant()));
});

test("未修改的舊草稿發布時，請求不帶識別碼", async function () {
  publish.reset();
  publish.setDraft(legacyDraft());

  await flow.publishDraft();

  assert.equal(harness.createCalls.length, 1);
  assert.equal("client_request_id" in harness.createCalls[0], false);
  assert.ok(hasNotice(assistantView.renderAssistant()));
});

test("舊草稿第一次修改後補上識別碼，部分失敗重試沿用同一個", async function () {
  publish.reset();
  publish.setDraft(legacyDraft());
  assert.equal("client_request_id" in store.state.room.context.draft, false);

  await listingActions.editDraft();
  await flow.submitText("尾數改成 3 尾");
  const edited = store.state.room.context.draft;
  const editedId = edited.client_request_id;
  assert.equal(edited.quantity, 3);
  assert.match(editedId, /^pub_/);

  const restore = failNextAiMessage();
  try {
    await flow.publishDraft();
    assert.equal(harness.createCalls.length, 1);
    assert.equal(harness.createCalls[0].quantity, 3);
    assert.equal(harness.createCalls[0].client_request_id, editedId);
    assert.equal(harness.notifyError.message, "訊息寫入失敗");

    await flow.publishDraft();
    assert.equal(harness.createCalls.length, 2);
    assert.equal(harness.createCalls[1].client_request_id, editedId);
    assert.ok(hasNotice(assistantView.renderAssistant()));
  } finally {
    restore();
  }
});
