/* demo 資料補值：沒有縣市的使用者隨機補一個，已有縣市者不覆寫。 */

const { all, patch } = require("./store");
const { CITIES } = require("./regions");

function pickCity() {
  return CITIES[Math.floor(Math.random() * CITIES.length)];
}

function fillMissingCities() {
  let changed = 0;
  all("users").forEach(function (user) {
    if (String(user.city || "").trim()) return;
    patch("users", user.id, { city: pickCity() });
    changed += 1;
  });
  return changed;
}

module.exports = { fillMissingCities: fillMissingCities };
