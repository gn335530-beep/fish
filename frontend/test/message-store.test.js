/* 共用狀態層的訊息取代與追加：去重、順序與游標。 */

import test from "node:test";
import assert from "node:assert/strict";

const { state, update, replaceMessages, appendMessages, totalUnread } =
  await import("../assets/js/demo/store.js");

test.beforeEach(function () {
  update({ messages: [], lastSeq: 0, conversations: [] });
});

test("追加重複序號的訊息不會增加長度，游標停在最大序號", function () {
  replaceMessages([
    { id: "msg_1", seq: 1 },
    { id: "msg_3", seq: 3 }
  ]);

  appendMessages([
    { id: "msg_3", seq: 3 },
    { id: "msg_4", seq: 4 }
  ]);

  assert.deepEqual(state.messages.map(function (message) { return message.id; }), ["msg_1", "msg_3", "msg_4"]);
  assert.equal(state.lastSeq, 4);
});

test("訊息缺漏序號時以識別碼去重", function () {
  replaceMessages([{ id: "msg_1" }]);

  appendMessages([{ id: "msg_1" }, { id: "msg_2" }]);

  assert.deepEqual(state.messages.map(function (message) { return message.id; }), ["msg_1", "msg_2"]);
});

test("取代清單只保留新訊息，游標取最大序號", function () {
  replaceMessages([
    { id: "msg_9", seq: 9 },
    { id: "msg_2", seq: 2 }
  ]);

  assert.deepEqual(state.messages.map(function (message) { return message.id; }), ["msg_9", "msg_2"]);
  assert.equal(state.lastSeq, 9);
});

test("追加不重排既有訊息，重複訊息也不重複計入未讀", function () {
  update({ conversations: [{ id: "conv_1", unread_count: 2 }] });
  replaceMessages([
    { id: "msg_1", seq: 1 },
    { id: "msg_3", seq: 3 }
  ]);

  appendMessages([
    { id: "msg_2", seq: 2 },
    { id: "msg_3", seq: 3 }
  ]);

  assert.deepEqual(state.messages.map(function (message) { return message.id; }), ["msg_1", "msg_3", "msg_2"]);
  assert.equal(state.lastSeq, 3);
  assert.equal(totalUnread(), 2);
});
