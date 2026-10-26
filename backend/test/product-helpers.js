/* 商品測試共用：以釣客 Token 建立商品。 */

const { call, tokens } = require("./client");

function create(overrides) {
  const payload = Object.assign({
    fish_species: "石斑",
    species_id: "grouper",
    weight_kg: 4.5,
    quantity: 1,
    condition: "放血冰鎮",
    photo_url: "/uploads/test.jpg",
    price: 1000,
    region: "高雄市"
  }, overrides || {});
  Object.keys(payload).forEach(function (key) {
    if (payload[key] === undefined) delete payload[key];
  });
  return call("POST", "/api/products/create", { token: tokens.seller, body: payload });
}

module.exports = { create: create };
