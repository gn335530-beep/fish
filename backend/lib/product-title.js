/* 商品標題格式：上架與既有資料修正共用，避免兩份格式漂移。 */

const { round1 } = require("./round");

function buildTitle(fishSpecies, weightKg, quantity, condition) {
  return fishSpecies + "（" + round1(weightKg) + "kg / " + quantity + "尾 / " + condition + "）";
}

module.exports = { buildTitle: buildTitle };
