/* 在地氣象地點：縣市座標與縣市→海域對照；海域名稱以中央氣象署用語為準。 */

const { normalizeArea } = require("../regions");

const CITY_COORDS = {
  "基隆市": { lat: 25.1283, lon: 121.7392 },
  "台北市": { lat: 25.0330, lon: 121.5654 },
  "新北市": { lat: 25.0169, lon: 121.4628 },
  "桃園市": { lat: 24.9937, lon: 121.3010 },
  "新竹市": { lat: 24.8138, lon: 120.9675 },
  "新竹縣": { lat: 24.8387, lon: 121.0177 },
  "苗栗縣": { lat: 24.5602, lon: 120.8214 },
  "台中市": { lat: 24.1477, lon: 120.6736 },
  "彰化縣": { lat: 24.0756, lon: 120.5440 },
  "南投縣": { lat: 23.9099, lon: 120.6857 },
  "雲林縣": { lat: 23.7092, lon: 120.4313 },
  "嘉義市": { lat: 23.4801, lon: 120.4491 },
  "嘉義縣": { lat: 23.4518, lon: 120.2550 },
  "台南市": { lat: 22.9999, lon: 120.2270 },
  "高雄市": { lat: 22.6273, lon: 120.3014 },
  "屏東縣": { lat: 22.6761, lon: 120.4942 },
  "宜蘭縣": { lat: 24.7570, lon: 121.7530 },
  "花蓮縣": { lat: 23.9911, lon: 121.6112 },
  "台東縣": { lat: 22.7583, lon: 121.1444 },
  "澎湖縣": { lat: 23.5711, lon: 119.5793 },
  "金門縣": { lat: 24.4321, lon: 118.3171 },
  "連江縣": { lat: 26.1605, lon: 119.9500 }
};

const CITY_SEA = {
  "基隆市": "臺灣北部海面",
  "新北市": "臺灣北部海面",
  "桃園市": "臺灣海峽北部",
  "新竹市": "臺灣海峽北部",
  "新竹縣": "臺灣海峽北部",
  "苗栗縣": "臺灣海峽北部",
  "台中市": "臺灣海峽北部",
  "彰化縣": "臺灣海峽北部",
  "雲林縣": "臺灣海峽南部",
  "嘉義縣": "臺灣海峽南部",
  "台南市": "臺灣海峽南部",
  "高雄市": "臺灣海峽南部",
  "屏東縣": "臺灣海峽南部",
  "宜蘭縣": "臺灣東北部海面",
  "花蓮縣": "臺灣東部海面",
  "台東縣": "臺灣東南部海面",
  "澎湖縣": "澎湖海面",
  "金門縣": "金門海面",
  "連江縣": "馬祖海面"
};

/* 海況座標與代表潮位站；潮位站取自中央氣象署潮汐預報的 NSea 分區。 */
const SEA_AREAS = {
  "臺灣北部海面": {
    lat: 25.4, lon: 121.8,
    tide: { name: "基隆", location: "基隆市中正區", fallback: "基隆市中正" }
  },
  "臺灣海峽北部": {
    lat: 24.6, lon: 120.5,
    tide: { name: "香山", location: "新竹市香山區", fallback: "新竹市香山" }
  },
  "臺灣海峽南部": {
    lat: 22.8, lon: 119.8,
    tide: { name: "鼓山", location: "高雄市鼓山區", fallback: "高雄市鼓山" }
  },
  "臺灣東北部海面": {
    lat: 24.8, lon: 122.0,
    tide: { name: "蘇澳", location: "宜蘭縣蘇澳鎮", fallback: "宜蘭縣蘇澳" }
  },
  "臺灣東部海面": {
    lat: 23.7, lon: 122.0,
    tide: { name: "花蓮", location: "花蓮縣花蓮市", fallback: "花蓮縣花蓮" }
  },
  "臺灣東南部海面": {
    lat: 22.4, lon: 121.5,
    tide: { name: "成功", location: "臺東縣成功鎮", fallback: "臺東縣成功" }
  },
  "澎湖海面": {
    lat: 23.6, lon: 119.5,
    tide: { name: "馬公", location: "澎湖縣馬公市", fallback: "澎湖縣馬公" }
  },
  "金門海面": {
    lat: 24.3, lon: 118.2,
    tide: { name: "金城", location: "金門縣金城鎮", fallback: "金門縣金城" }
  },
  "馬祖海面": {
    lat: 26.1, lon: 120.0,
    tide: { name: "南竿", location: "連江縣南竿鄉", fallback: "連江縣南竿" }
  },
  "巴士海峽": {
    lat: 21.8, lon: 120.8,
    tide: { name: "恆春", location: "屏東縣恆春鎮", fallback: "屏東縣恆春" }
  }
};

const SEA_ALIASES = [
  ["臺灣北部海面", ["臺灣北部海面", "北部海面"]],
  ["臺灣海峽北部", ["臺灣海峽北部", "海峽北部"]],
  ["臺灣海峽南部", ["臺灣海峽南部", "海峽南部"]],
  ["臺灣東北部海面", ["臺灣東北部海面", "東北部海面"]],
  ["臺灣東部海面", ["臺灣東部海面", "東部海面"]],
  ["臺灣東南部海面", ["臺灣東南部海面", "東南部海面"]],
  ["澎湖海面", ["澎湖海面"]],
  ["金門海面", ["金門海面"]],
  ["馬祖海面", ["馬祖海面"]],
  ["巴士海峽", ["巴士海峽"]]
];

function normalizeKey(value) {
  return normalizeArea(value).trim();
}

function canonicalSea(value) {
  const key = normalizeKey(value);
  if (!key) return "";
  return SEA_ALIASES.find(function (row) {
    return row[1].some(function (alias) { return normalizeKey(alias) === key; });
  })[0] || "";
}

function seaAreaInText(text) {
  const source = normalizeKey(text);
  let found = "";
  let length = 0;
  SEA_ALIASES.forEach(function (row) {
    row[1].forEach(function (alias) {
      const key = normalizeKey(alias);
      if (key.length > length && source.indexOf(key) !== -1) {
        found = row[0];
        length = key.length;
      }
    });
  });
  return found;
}

function seaAreaForCity(city) {
  return CITY_SEA[city] || "";
}

function coordsForCity(city) {
  return CITY_COORDS[city] || null;
}

function coordsForSea(area) {
  const row = SEA_AREAS[area];
  return row ? { lat: row.lat, lon: row.lon } : null;
}

function tideStationForSea(area) {
  return SEA_AREAS[area] ? SEA_AREAS[area].tide : null;
}

module.exports = {
  cityCoords: coordsForCity,
  seaCoords: coordsForSea,
  seaAreaForCity: seaAreaForCity,
  seaAreaInText: seaAreaInText,
  normalizeSeaArea: canonicalSea,
  tideStationForSea: tideStationForSea
};
