/* 面板外殼、標題列與頁尾的靜態結構。 */

import test from "node:test";
import assert from "node:assert/strict";

const { headerHtml } = await import("../assets/js/demo/views/panel-header.js");
const { footerHtml } = await import("../assets/js/demo/views/panel-footer.js");
const { shellHtml } = await import("../assets/js/demo/views/panel-shell.js");

test("助手標題列顯示 AI 聊天小幫手，沒有 v7 與狀態副標", function () {
  const html = headerHtml();
  assert.match(html, /AI 聊天小幫手/);
  assert.match(html, /data-action="inbox"/);
  assert.match(html, /data-action="minimize"/);
  assert.match(html, /data-action="close"/);
  assert.doesNotMatch(html, /一支釣小幫手|v7|fm-build|fm-status/);
});

test("頁尾依序為語音、相機、輸入框與送出圖示", function () {
  const html = footerHtml();
  const voice = html.indexOf('id="fm-voice"');
  const photo = html.indexOf('data-action="photo"');
  const input = html.indexOf('id="fm-input"');
  const send = html.indexOf('class="fm-send"');
  assert.ok(voice >= 0 && photo > voice && input > photo && send > input);
  assert.match(html, /aria-label="語音輸入"/);
  assert.match(html, /aria-pressed="false"/);
  assert.match(html, /maxlength="500"/);
  assert.match(html, /aria-label="送出"/);
  assert.doesNotMatch(html, />送出</);
  assert.match(html, /<svg/);
});

test("外殼組合標題列、內文區與頁尾", function () {
  const html = shellHtml();
  assert.match(html, /id="fm-panel"/);
  assert.match(html, /aria-label="AI 聊天小幫手"/);
  assert.doesNotMatch(html, /一支釣小幫手/);
  assert.match(html, /id="fm-title"/);
  assert.match(html, /id="fm-body"/);
  assert.match(html, /id="fm-form"/);
  assert.doesNotMatch(html, /fm-panel--wide/);
});
