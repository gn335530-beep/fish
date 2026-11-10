/* 首頁平台流程：靜態時間軸保留在 HTML，並鎖定 200 行上限與既有文案。 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../pages/index.html", import.meta.url), "utf8");

test("首頁低於 200 行，保留五個平台流程步驟", function () {
  assert.ok(html.split(/\r?\n/).length < 200);
  assert.equal((html.match(/class="tl__item"/g) || []).length, 5);
});

test("五個步驟的標題與說明都留在靜態 HTML", function () {
  [
    "STEP 01", "釣客出海捕撈", "依當日情況，釣到什麼不一定",
    "STEP 02", "回港上架", "在助手房對話上架", "說清楚魚種、尾數與售價",
    "STEP 03", "買家選購", "尋找商品", "與釣客確認魚況後洽談",
    "STEP 04", "與釣客聊聊", "確認面交位置", "出發前往面交地點",
    "STEP 05", "交易完成", "留下你的寶貴評論", "期待下次回購"
  ].forEach(function (text) {
    assert.match(html, new RegExp(text));
  });
});
