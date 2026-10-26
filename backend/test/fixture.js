/* 測試用資料庫：每個測試檔一份暫存 db.json，避免動到開發資料。 */

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function user(id, username, displayName, role) {
  return {
    id: id,
    username: username,
    password: "pw" + id,
    display_name: displayName,
    role: role,
    is_verified: true,
    completed_orders: 0,
    completed_deals: 0,
    city: "新北市",
    district: "",
    address_line: "",
    rating_score: 0,
    review_count: 0,
    no_show_count: 0,
    is_blacklisted: false,
    bank_code: "",
    bank_account: "",
    bank_account_name: ""
  };
}

function product(id, sellerId, name, quantity, price) {
  return {
    id: id,
    seller_id: sellerId,
    title: name + "（2kg / " + quantity + "尾 / 活體）",
    fish_species: name,
    species_id: null,
    species_latin: "",
    weight_kg: 2,
    quantity: quantity,
    sold_quantity: 0,
    condition: "活體",
    photo_url: "/uploads/" + id + ".jpg",
    price: price,
    region: "新北市",
    location: "新北市瑞芳區",
    catch_time: "2026-10-25T05:00:00+08:00",
    created_at: "2026-10-25T05:00:00.000Z"
  };
}

function createDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fishmatch-"));
  const file = path.join(dir, "db.json");
  const data = {
    users: [
      user(1, "0911111111", "釣客甲", "SELLER"),
      user(2, "0922222222", "買家乙", "BUYER"),
      user(3, "0933333333", "路人丙", "BUYER"),
      user(4, "0944444444", "釣客丁", "SELLER")
    ],
    products: [
      product("prd_a", 1, "石斑", 2, 2800),
      product("prd_b", 1, "嘉鱲", 2, 3060),
      product("prd_c", 4, "花枝", 1, 500)
    ],
    conversations: [],
    messages: [],
    deals: [],
    reviews: []
  };
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
}

module.exports = { createDb: createDb };
