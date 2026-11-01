/* 語音輸入：支援判斷、語言、單次辨識、附加文字與錯誤提示。 */

import test from "node:test";
import assert from "node:assert/strict";

const { initVoice } = await import("../assets/js/demo/voice.js");

function fakeButton() {
  const attrs = {};
  const listeners = {};
  return {
    attrs: attrs,
    addEventListener: function (type, handler) { listeners[type] = handler; },
    setAttribute: function (key, value) { attrs[key] = String(value); },
    click: function () { if (listeners.click) listeners.click(); }
  };
}

function fakeInput() {
  return { value: "", focused: false, focus: function () { this.focused = true; } };
}

class FakeRecognition {
  constructor() {
    FakeRecognition.last = this;
    this.lang = "";
    this.continuous = true;
    this.interimResults = true;
  }
  start() { this.started = true; }
  stop() { this.stopped = true; }
  result(text) { this.onresult({ results: [[{ transcript: text }]] }); }
  error(code) { this.onerror({ error: code }); }
  end() { this.onend(); }
}

test.beforeEach(function () {
  globalThis.window = {};
});

test("瀏覽器不支援時顯示明確提示", function () {
  const notices = [];
  const button = fakeButton();
  const voice = initVoice({
    button: button,
    input: fakeInput(),
    onError: function (message) { notices.push(message); }
  });
  assert.equal(voice.supported, false);
  button.click();
  assert.deepEqual(notices, ["這個瀏覽器不支援語音輸入"]);
});

test("使用 zh-TW 單次辨識，錄音中反映按壓狀態", function () {
  globalThis.window.SpeechRecognition = FakeRecognition;
  const button = fakeButton();
  const input = fakeInput();
  initVoice({ button: button, input: input, onError: function () {} });

  const recognition = FakeRecognition.last;
  assert.equal(recognition.lang, "zh-TW");
  assert.equal(recognition.continuous, false);
  assert.equal(recognition.interimResults, false);

  button.click();
  assert.equal(recognition.started, true);
  assert.equal(button.attrs["aria-pressed"], "true");
  assert.equal(input.focused, true);

  recognition.end();
  assert.equal(button.attrs["aria-pressed"], "false");
});

test("辨識結果附加到既有輸入內容，不覆蓋", function () {
  globalThis.window.SpeechRecognition = FakeRecognition;
  const button = fakeButton();
  const input = fakeInput();
  input.value = "我想買 ";
  initVoice({ button: button, input: input, onError: function () {} });
  FakeRecognition.last.result("兩尾石斑");
  assert.equal(input.value, "我想買 兩尾石斑");
});

test("語音結果不會超過輸入上限", function () {
  globalThis.window.SpeechRecognition = FakeRecognition;
  const button = fakeButton();
  const input = fakeInput();
  input.maxLength = 5;
  initVoice({ button: button, input: input, onError: function () {} });
  FakeRecognition.last.result("一二三四五六");
  assert.equal(input.value, "一二三四五");
});

test("權限被拒與其他錯誤會提示，no-speech 不提示", function () {
  globalThis.window.SpeechRecognition = FakeRecognition;
  const notices = [];
  const button = fakeButton();
  initVoice({
    button: button,
    input: fakeInput(),
    onError: function (message) { notices.push(message); }
  });
  const recognition = FakeRecognition.last;

  recognition.error("not-allowed");
  recognition.error("network");
  recognition.error("no-speech");
  assert.deepEqual(notices, ["麥克風權限被拒絕，請允許後再試", "語音輸入失敗，請再試一次"]);
  assert.equal(button.attrs["aria-pressed"], "false");
});
