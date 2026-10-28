/* 官方代碼字典查詢：精確官方名稱、常見別名或純數字代碼；不做模糊比對。 */

const catalogStore = require("./catalog-store");

/* 補官方名稱與使用者說法的差異；值是可以對到的官方名稱。 */
const COMMON_ALIASES = {
  "土魠魚": ["土魠"],
  "嘉鱲": ["嘉鱲", "真鯛"],
  "赤鯮": ["赤鯮", "赤宗"],
  "海鱸": ["七星鱸", "海鱸"],
  "竹筴魚": ["竹筴魚", "巴攏"],
  "石斑": ["石斑魚", "龍膽石斑", "其他石斑魚"],
  "吳郭魚": ["吳郭魚", "尼羅魚"],
  "鮭魚": ["鮭魚", "大西洋鮭"]
};

function candidate(row) {
  return {
    species_code: row.species_code,
    official_name: row.official_name,
    aliases: row.aliases || [],
    category: row.category,
    is_aquaculture: row.is_aquaculture === true,
    last_seen_date: row.last_seen_date
  };
}

function namesOf(row) {
  return [row.official_name].concat(row.aliases || []);
}

function sortedRows() {
  return catalogStore.allCodes().slice().sort(function (a, b) {
    return Number(a.species_code) - Number(b.species_code);
  });
}

/* 回傳候選；同名多代碼時全部回傳，順序固定為代碼由小到大。 */
function lookup(query) {
  const text = String(query === undefined || query === null ? "" : query).trim();
  const rows = sortedRows();
  if (!text) return { candidates: rows.map(candidate) };

  if (/^\d+$/.test(text)) {
    return {
      candidates: rows.filter(function (row) {
        return String(row.species_code) === text;
      }).map(candidate)
    };
  }

  const wanted = new Set([text].concat(COMMON_ALIASES[text] || []));
  return {
    candidates: rows.filter(function (row) {
      return namesOf(row).some(function (name) { return wanted.has(name); });
    }).map(candidate)
  };
}

module.exports = {
  COMMON_ALIASES: COMMON_ALIASES,
  lookup: lookup
};
