/* 面板內文：輸入中凍結重畫，閒置、失焦或強制時才補畫。 */

import test from "node:test";
import assert from "node:assert/strict";

let now = 1000000;
Date.now = () => now;

const timers = [];
globalThis.window = {
  setTimeout: function (fn, wait) { timers.push({ fn: fn, wait: wait }); return timers.length; },
  clearTimeout: function () {}
};

let active = null;
globalThis.document = {
  activeElement: null,
  getElementById: function () { return null; }
};
Object.defineProperty(globalThis.document, "activeElement", { get: function () { return active; } });

const moduleUrl = new URL("../assets/js/demo/views/body-render.js", import.meta.url).href;
const { createBodyRenderer } = await import(moduleUrl);

function setup() {
  const listeners = {};
  const body = {
    innerHTML: "",
    contains: function (element) { return !!(element && element._inside); },
    addEventListener: function (type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    querySelector: function () { return null; }
  };
  const field = {
    tagName: "INPUT",
    type: "text",
    id: "",
    _inside: true,
    selectionStart: 2,
    selectionEnd: 2,
    getAttribute: function () { return "meetup_location"; },
    focus: function () { active = this; }
  };
  const fire = function (type, target) {
    (listeners[type] || []).forEach(function (fn) { fn({ target: target || body }); });
  };
  timers.length = 0;
  active = null;
  let renders = 0;
  const renderer = createBodyRenderer({
    body: body,
    onRender: function () {
      renders += 1;
      renderer.setBody("<p>fresh</p>");
    }
  });
  return { body: body, field: field, fire: fire, renderer: renderer, renders: function () { return renders; } };
}

test("輸入中不換掉 DOM，閒置後補畫一次", function () {
  const ui = setup();
  ui.renderer.setBody("<p>a</p>");
  assert.equal(ui.body.innerHTML, "<p>a</p>");

  active = ui.field;
  ui.fire("focusin", ui.field);
  now += 1000;
  ui.renderer.setBody("<p>b</p>");
  assert.equal(ui.body.innerHTML, "<p>a</p>");

  ui.fire("compositionstart", ui.field);
  ui.renderer.setBody("<p>c</p>");
  ui.fire("compositionend", ui.field);
  assert.equal(ui.body.innerHTML, "<p>a</p>");

  now += 6000;
  timers[timers.length - 1].fn();
  assert.equal(ui.body.innerHTML, "<p>fresh</p>");
  assert.equal(ui.renders(), 1);
});

test("組字中即使強制也先凍結，組字結束才補畫", function () {
  const ui = setup();
  ui.renderer.setBody("<p>a</p>");
  active = ui.field;
  ui.fire("focusin", ui.field);
  now += 1000;
  ui.fire("compositionstart", ui.field);

  ui.renderer.setBody("<p>b</p>", { force: true });
  assert.equal(ui.body.innerHTML, "<p>a</p>");

  ui.fire("compositionend", ui.field);
  timers[timers.length - 1].fn();
  assert.equal(ui.body.innerHTML, "<p>fresh</p>");
});

test("非組字時強制補畫立即生效，失焦後才補一般變更", function () {
  const ui = setup();
  ui.renderer.setBody("<p>a</p>");
  active = ui.field;
  ui.fire("focusin", ui.field);
  now += 1000;

  ui.renderer.setBody("<p>held</p>");
  assert.equal(ui.body.innerHTML, "<p>a</p>");

  ui.renderer.setBody("<p>forced</p>", { force: true });
  assert.equal(ui.body.innerHTML, "<p>forced</p>");

  active = ui.field;
  now += 1000;
  ui.fire("focusin", ui.field);
  ui.renderer.setBody("<p>held-again</p>");
  active = null;
  ui.fire("focusout", ui.field);
  timers[timers.length - 1].fn();
  assert.equal(ui.body.innerHTML, "<p>fresh</p>");
});
