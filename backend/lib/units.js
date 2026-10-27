/* 台斤換算：後端唯一常數，定價與行情都引用這裡。 */

const KG_PER_TAIJIN = 0.6;

function kgFromTaijin(value) {
  return Number(value) * KG_PER_TAIJIN;
}

function taijinFromKg(value) {
  return Number(value) / KG_PER_TAIJIN;
}

module.exports = {
  KG_PER_TAIJIN: KG_PER_TAIJIN,
  kgFromTaijin: kgFromTaijin,
  taijinFromKg: taijinFromKg
};
