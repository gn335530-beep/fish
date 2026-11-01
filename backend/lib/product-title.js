/* 商品標題格式：上架與既有資料修正共用，避免兩份格式漂移。 */

function buildTitle(fishSpecies, quantity, condition) {
  return fishSpecies + "（" + quantity + "尾 / " + condition + "）";
}

module.exports = { buildTitle: buildTitle };
