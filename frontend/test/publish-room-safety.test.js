/* 發布房間安全：等待期間切房，成功與失敗都只影響原本房間。 */

import test from "node:test";
import assert from "node:assert/strict";
import { NOTICE, PRODUCT, createGate, setupPublishTest } from "./publish-fixtures.js";

const publish = await setupPublishTest();
const store = publish.store;
const flow = publish.flow;
const harness = publish.harness;

function switchRoom() {
  const context = { mode: "idle", draft: null, last_cards: [], marker: "keep" };
  const message = publish.otherMessage();
  store.update({
    room: { id: "conv_b", type: "assistant", context: context },
    messages: [message]
  });
  return { context: context, message: message };
}

test("發布期間切房，結果只寫回原本房間", async function () {
  const gate = createGate();
  publish.reset();
  harness.createHandler = async function () {
    await gate.promise;
    return { data: PRODUCT };
  };

  const running = flow.publishDraft();
  const other = switchRoom();
  gate.release();
  await running;

  assert.equal(store.state.room.id, "conv_b");
  assert.deepEqual(store.state.messages, [other.message]);
  assert.equal(store.state.room.context, other.context);
  assert.equal(harness.notifyError, null);

  const chat = publish.ai.requests.filter(function (entry) { return entry.path === "/api/chat/message"; });
  assert.equal(chat.length, 1);
  assert.equal(chat[0].body.conversation_id, "conv_1");
  const paths = publish.ai.requests.map(function (entry) { return entry.path; });
  assert.ok(paths.indexOf("/api/conversations/conv_1/context") !== -1);
  assert.ok(paths.indexOf("/api/conversations/conv_1/clear") !== -1);
  assert.deepEqual(harness.toasts, [NOTICE]);
});

test("發布期間切房後失敗，不在目前房間顯示面板提示", async function () {
  const gate = createGate();
  publish.reset();
  harness.createHandler = async function () {
    await gate.promise;
    throw new Error("上架失敗");
  };

  const running = flow.publishDraft();
  const other = switchRoom();
  gate.release();
  await running;

  assert.equal(store.state.room.context, other.context);
  assert.deepEqual(store.state.messages, [other.message]);
  assert.equal(harness.notifyError, null);
  assert.deepEqual(harness.toasts, ["上架失敗"]);
});
