/* 商品標題格式：上架與既有資料修正共用，避免兩份格式漂移。 */

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}

function buildTitle(fishSpecies, weightKg, quantity, condition) {
  return fishSpecies + "（" + round1(weightKg) + "kg / " + quantity + "尾 / " + condition + "）";
}

module.exports = { round1: round1, buildTitle: buildTitle };
