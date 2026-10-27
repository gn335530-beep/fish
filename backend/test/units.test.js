/* 台斤換算：後端只有一個常數，定價與行情都引用它。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const units = require("../lib/units");

test("台斤換算常數與雙向換算", function () {
  assert.equal(units.KG_PER_TAIJIN, 0.6);
  assert.equal(units.kgFromTaijin(2), 1.2);
  assert.equal(units.taijinFromKg(3), 5);
});
