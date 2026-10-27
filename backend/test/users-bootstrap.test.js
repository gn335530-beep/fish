/* demo 使用者補縣市：沒有 city 才隨機補，已有者不覆寫。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop } = require("./client");
const { insert, findById } = require("../lib/store");
const { CITIES } = require("../lib/regions");
const { fillMissingCities } = require("../lib/user-bootstrap");

function user(id, city) {
  return {
    id: id,
    username: "0977" + id,
    password: "pw",
    display_name: "測試" + id,
    city: city,
    district: "",
    address_line: ""
  };
}

test.before(start);
test.after(stop);

test("沒有縣市的使用者補上清單內的縣市", function () {
  insert("users", user(901, ""));
  fillMissingCities();
  assert.ok(CITIES.indexOf(findById("users", 901).city) !== -1);
});

test("已有縣市的使用者不被覆寫", function () {
  insert("users", user(902, "高雄市"));
  fillMissingCities();
  assert.equal(findById("users", 902).city, "高雄市");
});
