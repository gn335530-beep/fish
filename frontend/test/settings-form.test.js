/* 設定表單：暱稱、電話、縣市與地址驗證，頭像 fallback 與送出欄位。 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizePhone,
  validateSettings,
  avatarHTML,
  updatePayload
} from "../assets/js/profile/settings-form.js";

const REGIONS = ["基隆市", "台北市", "新北市", "台中市", "高雄市"];

function values(overrides) {
  return Object.assign({
    display_name: "陳阿海",
    phone: "0912345678",
    city: "新北市",
    district: "瑞芳區",
    address_line: "鼻頭路 1 號"
  }, overrides || {});
}

test("電話去掉空白與連字號後需為 09 開頭共 10 碼", function () {
  assert.equal(normalizePhone("0912-345-678"), "0912345678");
  assert.equal(validateSettings(values(), REGIONS).valid, true);
  assert.equal(validateSettings(values({ phone: "0812345678" }), REGIONS).valid, false);
  assert.equal(validateSettings(values({ phone: "091234567" }), REGIONS).valid, false);
});

test("暱稱 2 到 20 字、縣市必填且在清單內、地址長度沿用限制", function () {
  assert.equal(validateSettings(values({ display_name: "甲" }), REGIONS).errors.display_name, "請填寫 2 到 20 字");
  assert.equal(validateSettings(values({ display_name: "甲".repeat(21) }), REGIONS).errors.display_name, "請填寫 2 到 20 字");
  assert.equal(validateSettings(values({ city: "" }), REGIONS).errors.city, "請選擇縣市");
  assert.equal(validateSettings(values({ city: "火星市" }), REGIONS).errors.city, "請選擇縣市");
  assert.equal(validateSettings(values({ district: "區".repeat(21) }), REGIONS).errors.district, "最多 20 字");
  assert.equal(validateSettings(values({ address_line: "路".repeat(101) }), REGIONS).errors.address_line, "最多 100 字");
});

test("頭像有圖顯示圖片，沒有圖顯示名字首字", function () {
  assert.match(avatarHTML("陳阿海", "/uploads/a.jpg", "avatar"), /<img src="\/uploads\/a\.jpg" alt="陳阿海">/);
  const fallback = avatarHTML("陳阿海", "", "avatar");
  assert.match(fallback, />陳<\/span>/);
  assert.doesNotMatch(fallback, /<img/);
});

test("送出欄位會 trim、正規化電話並帶頭像網址", function () {
  assert.deepEqual(updatePayload(values({
    display_name: "  小魚  ",
    phone: "0912-345-678",
    district: "  ",
    address_line: " 公益路 1 號 "
  }), "/uploads/a.jpg", REGIONS), {
    display_name: "小魚",
    phone: "0912345678",
    avatar_url: "/uploads/a.jpg",
    city: "新北市",
    district: "",
    address_line: "公益路 1 號"
  });
});
