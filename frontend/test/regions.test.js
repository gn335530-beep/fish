/* 地區模組：正規化與解析集中一份，魚種模組不再負責。 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

import { findRegion, normalizeCityName } from "../assets/js/shared/regions.js";

function read(path) {
  return fs.readFileSync(new URL(path, import.meta.url), "utf8");
}

test("臺正規化為台，地區解析可接受全名與簡稱", function () {
  assert.equal(normalizeCityName("臺北市"), "台北市");
  assert.equal(findRegion("臺北市石斑多少錢"), "台北市");
  assert.equal(findRegion("高雄石斑多少錢"), "高雄市");
  assert.equal(findRegion("澎湖縣白鯧"), "澎湖縣");
  assert.equal(findRegion("今天行情如何"), "");
});

test("縣市清單只有一份，且同時供 classic 與 module 使用", function () {
  const ctx = vm.createContext({});
  vm.runInContext(read("../assets/js/shared/regions-data.js"), ctx);
  assert.equal(ctx.TAIWAN_REGIONS.length, 22);
  assert.equal(ctx.HaisenRegionText.normalizeCityName("臺北市"), "台北市");
  assert.match(read("../assets/js/app/04-regions.js"), /globalThis\.TAIWAN_REGIONS/);
  assert.doesNotMatch(read("../assets/js/app/04-regions.js"), /"基隆市"/);
});

test("魚種模組不再提供地區解析", async function () {
  const species = await import("../assets/js/demo/ai/species.js");
  assert.equal(species.findRegion, undefined);
  assert.equal(species.normalizeCityName, undefined);
});
