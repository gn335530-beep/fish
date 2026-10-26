/* 登入／註冊頁：縣市欄位、法規告知與文案修正。 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../pages/login.html", import.meta.url), "utf8");
const script = fs.readFileSync(new URL("../assets/js/pages/login.js", import.meta.url), "utf8");
const apiAuth = fs.readFileSync(new URL("../assets/js/api/auth.js", import.meta.url), "utf8");

test("註冊表單有必填縣市欄位", function () {
  assert.match(html, /id="rg-city"[^>]*required/);
  assert.match(html, /<option value="台北市">/);
  assert.match(html, /<option value="連江縣">/);
  assert.match(script, /rg-city/);
  assert.match(script, /city: city/);
  assert.match(apiAuth, /city: p\.city/);
});

test("兩個 tab 都看得到法規告知與漁業法連結", function () {
  assert.match(html, /販賣魚貨（一支釣）需依照法規申請相關合法證照/);
  assert.match(html, /新臺幣三萬元以上三十萬元以下罰鍰/);
  assert.match(html, /https:\/\/law\.moj\.gov\.tw\/LawClass\/LawAll\.aspx\?pcode=M0050001/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener"/);
});

test("左側文案已修正且不再承諾低溫直送", function () {
  assert.match(html, /當日漁獲/);
  assert.match(html, /官方行情/);
  assert.match(html, /洽談後成立訂單/);
  assert.doesNotMatch(html, /現流|澎湖魚市|下單|隔日清晨低溫直送/);
});
