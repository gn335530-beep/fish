/* 一位小數四捨五入：行情、商品標題與評分共用。 */

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}

module.exports = { round1: round1 };
