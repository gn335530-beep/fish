/* 面板凍結判斷：哪些欄位算輸入中、什麼時候該停止重畫。 */

import test from "node:test";
import assert from "node:assert/strict";

const guard = await import("../assets/js/demo/views/body-guard.js");

test("文字類欄位算輸入中", function () {
  assert.equal(guard.isEditable({ tagName: "INPUT", type: "text" }), true);
  assert.equal(guard.isEditable({ tagName: "input", type: "datetime-local" }), true);
  assert.equal(guard.isEditable({ tagName: "INPUT", type: "number" }), true);
  assert.equal(guard.isEditable({ tagName: "TEXTAREA" }), true);
  assert.equal(guard.isEditable({ tagName: "SELECT" }), true);
  assert.equal(guard.isEditable({ tagName: "DIV", isContentEditable: true }), true);
});

test("勾選框、按鈕與一般元素不算輸入中", function () {
  assert.equal(guard.isEditable({ tagName: "INPUT", type: "checkbox" }), false);
  assert.equal(guard.isEditable({ tagName: "BUTTON" }), false);
  assert.equal(guard.isEditable({ tagName: "DIV" }), false);
  assert.equal(guard.isEditable(null), false);
});

test("組字中一律凍結", function () {
  assert.equal(guard.shouldHold({ composing: true, editable: false, idleMs: 0 }), true);
});

test("可編輯欄位在閒置上限內凍結", function () {
  assert.equal(guard.shouldHold({ composing: false, editable: true, idleMs: 1000 }), true);
  assert.equal(guard.shouldHold({ composing: false, editable: true, idleMs: guard.IDLE_LIMIT }), false);
  assert.equal(guard.shouldHold({ composing: false, editable: false, idleMs: 0 }), false);
});
