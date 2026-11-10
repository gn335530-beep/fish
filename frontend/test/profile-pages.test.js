/* 頁面契約：個人資訊／設定頁載入共用頁殼，導覽與抽屜入口符合新資訊架構。 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(new URL(path, import.meta.url), "utf8");
}

const profilePage = read("../pages/profile.html");
const settingsPage = read("../pages/settings.html");
const account = read("../assets/js/app/02-account.js");
const drawer = read("../assets/js/app/06-drawer.js");
const drawerPanels = read("../assets/js/app/07-drawer-panels.js");
const settingsScript = read("../assets/js/pages/settings.js");
const profileScript = read("../assets/js/pages/profile.js");
const productsController = read("../assets/js/profile/products-controller.js");
const reviewsController = read("../assets/js/profile/reviews-controller.js");

test("新頁面有 header／footer placeholder、共用 CSS 與正確模組", function () {
  [profilePage, settingsPage].forEach(function (html) {
    assert.match(html, /id="site-header"/);
    assert.match(html, /id="site-footer"/);
    assert.match(html, /assets\/css\/base\.css/);
    assert.match(html, /assets\/css\/layout\.css/);
    assert.match(html, /assets\/css\/profile-page\.css/);
    assert.match(html, /assets\/js\/config\.js/);
    assert.match(html, /assets\/js\/api\/client\.js/);
    assert.match(html, /assets\/js\/app\/02-account\.js/);
    assert.match(html, /assets\/js\/app\/08-api-init\.js/);
    assert.doesNotMatch(html, /product-detail/);
  });
  assert.match(profilePage, /type="module" src="\.\.\/assets\/js\/pages\/profile\.js/);
  assert.match(profilePage, /assets\/css\/profile-content\.css/);
  assert.match(settingsPage, /type="module" src="\.\.\/assets\/js\/pages\/settings\.js/);
});

test("導覽列「我的」順序為個人資訊、設定、交易紀錄、上架紀錄、登出", function () {
  const start = account.indexOf('<div class="nav-menu__label">我的</div>');
  assert.ok(start >= 0);
  const end = account.indexOf("</div>`;", start);
  assert.ok(end > start);
  const nav = account.slice(start, end);
  const order = ["個人資訊", "設定", "交易紀錄", "上架紀錄", "登出"].map(function (label) {
    const index = nav.indexOf(label);
    assert.ok(index >= 0, "導覽列缺少 " + label);
    return index;
  });
  assert.deepEqual(order, order.slice().sort(function (a, b) { return a - b; }));
  assert.match(account, /href="profile\.html\?id=/);
  assert.match(account, /href="settings\.html"/);
});

test("抽屜只留交易紀錄與上架紀錄，標題頭像與名字連到自己的個人資訊", function () {
  assert.match(drawerPanels, /交易紀錄/);
  assert.match(drawerPanels, /上架紀錄/);
  assert.doesNotMatch(drawerPanels, /dr-nick-input|dr-av-file|dr-save|handleAvatarFile/);
  assert.match(drawer, /id="dr-who"/);
  assert.match(drawer, /profile\.html\?id=/);
});

test("商品卡釣客資訊是帶 id 的連結；推薦小卡沒有這個按鈕", function () {
  const productView = read("../assets/js/app/05-product-view.js");
  assert.match(productView, /href="profile\.html\?id=/);
  assert.match(productView, /釣客資訊/);
  assert.doesNotMatch(productView, /data-action="seller-info"/);
  assert.doesNotMatch(read("../assets/js/demo/views/product-card.js"), /釣客資訊/);
});

test("設定頁未登入導到登入頁，儲存後同步本機會員與導覽列", function () {
  assert.match(settingsScript, /location\.replace\("login\.html"\)/);
  assert.match(settingsScript, /API\.setUser\(API\.toLocalUser/);
  assert.match(settingsScript, /renderAuthNav\(\)/);
  assert.match(profileScript, /getPublicUser/);
  assert.match(profileScript, /isSelf/);
  assert.match(profileScript, /startRoom/);
  assert.match(productsController, /productSectionHTML/);
  assert.match(productsController, /data-profile-manage/);
  assert.match(reviewsController, /reviewSectionHTML/);
  assert.match(reviewsController, /data-review-role/);
});
