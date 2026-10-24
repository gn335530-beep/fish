/* 魚種查詢：資料來自主 API 的 GET /api/species，不在前端保留第二份字典。 */

let species = [];
let loading = null;

export function loadSpecies() {
  if (!loading) {
    loading = window.HaisenAPI.listSpecies().then(function (rows) {
      species = rows || [];
      return species;
    }).catch(function (error) {
      loading = null;
      throw error;
    });
  }
  return loading;
}

export function speciesList() {
  return species;
}

export async function ensureSpecies() {
  try {
    await loadSpecies();
    return true;
  } catch (error) {
    return false;
  }
}

export function speciesById(id) {
  return species.find(function (item) { return item.id === id; }) || null;
}

/* 取文字中最長的魚種名稱或別名，避免「石斑」誤蓋「玳瑁石斑」。 */
export function findSpecies(text) {
  const source = String(text || "");
  let best = null;
  let bestLength = 0;
  species.forEach(function (item) {
    [item.name].concat(item.alias || []).forEach(function (name) {
      if (source.indexOf(name) !== -1 && name.length > bestLength) {
        best = item;
        bestLength = name.length;
      }
    });
  });
  return best;
}

export const TAIWAN_REGIONS = [
  "基隆市", "臺北市", "新北市", "桃園市", "新竹市", "新竹縣", "苗栗縣",
  "臺中市", "彰化縣", "南投縣", "雲林縣", "嘉義市", "嘉義縣", "臺南市",
  "高雄市", "屏東縣", "宜蘭縣", "花蓮縣", "臺東縣", "澎湖縣", "金門縣", "連江縣"
];

export function findRegion(text) {
  const normalized = String(text || "").replace(/台/g, "臺");
  const hits = TAIWAN_REGIONS.filter(function (region) {
    const short = region.replace(/[市縣]$/, "");
    return normalized.indexOf(region) !== -1 || normalized.indexOf(short) !== -1;
  });
  hits.sort(function (a, b) { return b.length - a.length; });
  return hits[0] || "";
}
