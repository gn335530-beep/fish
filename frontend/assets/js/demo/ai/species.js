/* 魚種字典：名稱、別名、行情（元／台斤）與料理資訊。 */

export const SPECIES = [
  { id: "amberjack", name: "紅魽", alias: ["紅甘", "紅魽魚"], market: 486,
    texture: "油脂豐富、肉質彈牙", bones: "細刺少", cooking: ["生魚片", "香煎", "炙燒"] },
  { id: "seabream", name: "嘉鱲", alias: ["真鯛", "嘉鱲魚", "加鱲"], market: 648,
    texture: "肉質細緻、甜度高", bones: "刺少", cooking: ["清蒸", "煮湯", "鹽烤"] },
  { id: "grouper", name: "玳瑁石斑", alias: ["石斑", "石斑魚"], market: 742,
    texture: "肉質緊實、膠質多", bones: "細刺少", cooking: ["清蒸", "煮湯", "紅燒"] },
  { id: "tuna", name: "黑鮪", alias: ["黑鮪魚", "鮪魚"], market: 1580,
    texture: "油花均勻、入口即化", bones: "刺少", cooking: ["生魚片", "香煎"] },
  { id: "seabass", name: "海鱸", alias: ["鱸魚"], market: 402,
    texture: "肉質細嫩、味道清淡", bones: "刺少", cooking: ["清蒸", "煮湯"] },
  { id: "mackerel", name: "白腹鯖", alias: ["鯖魚"], market: 168,
    texture: "油脂豐富、風味濃", bones: "細刺較多", cooking: ["鹽烤", "煎"] },
  { id: "squid", name: "澎湖小卷", alias: ["小卷", "軟絲", "透抽"], market: 392,
    texture: "口感脆彈", bones: "無刺", cooking: ["川燙", "三杯", "烤"] },
  { id: "redseabream", name: "赤鯮", alias: [], market: 560,
    texture: "肉質細緻", bones: "刺少", cooking: ["清蒸", "煮湯"] },
  { id: "blackbream", name: "黑鯛", alias: ["黑格"], market: 380,
    texture: "肉質緊實", bones: "刺少", cooking: ["清蒸", "紅燒"] },
  { id: "yellowfin", name: "黃鰭鮪", alias: [], market: 620,
    texture: "肉質扎實", bones: "刺少", cooking: ["生魚片", "煎"] },
  { id: "dolphinfish", name: "鬼頭刀", alias: [], market: 220,
    texture: "肉質結實", bones: "刺少", cooking: ["煎", "紅燒"] },
  { id: "scad", name: "竹筴魚", alias: ["巴攏"], market: 150,
    texture: "油脂適中", bones: "細刺多", cooking: ["鹽烤", "煎"] },
  { id: "ribbonfish", name: "白帶魚", alias: [], market: 240,
    texture: "肉質細軟", bones: "刺多", cooking: ["乾煎", "紅燒"] },
  { id: "threadfin", name: "午仔魚", alias: [], market: 420,
    texture: "肉質細嫩、油脂高", bones: "刺少", cooking: ["清蒸", "煎"] },
  { id: "bigeye", name: "紅目鰱", alias: [], market: 300,
    texture: "肉質細緻", bones: "刺少", cooking: ["煮湯", "清蒸"] },
  { id: "tilefish", name: "馬頭魚", alias: [], market: 520,
    texture: "肉質細白", bones: "刺少", cooking: ["清蒸", "煮湯"] },
  { id: "rockfish", name: "石狗公", alias: [], market: 340,
    texture: "肉質緊實", bones: "刺少", cooking: ["煮湯"] },
  { id: "leatherjacket", name: "剝皮魚", alias: [], market: 260,
    texture: "肉質清甜", bones: "刺少", cooking: ["煮湯", "煎"] },
  { id: "cuttlefish", name: "花枝", alias: [], market: 360,
    texture: "口感脆彈", bones: "無刺", cooking: ["炒", "川燙"] },
  { id: "octopus", name: "章魚", alias: [], market: 480,
    texture: "口感彈牙", bones: "無刺", cooking: ["涼拌", "滷"] },
  { id: "lobster", name: "龍蝦", alias: [], market: 1800,
    texture: "肉質緊實鮮甜", bones: "無刺", cooking: ["清蒸", "煮湯"] },
  { id: "crab", name: "三點蟹", alias: [], market: 520,
    texture: "肉質細緻", bones: "無刺", cooking: ["清蒸", "炒"] },
  { id: "shrimp", name: "白蝦", alias: ["蝦"], market: 380,
    texture: "口感脆甜", bones: "無刺", cooking: ["川燙", "炒"] },
  { id: "oyster", name: "牡蠣", alias: ["蚵"], market: 280,
    texture: "鮮甜多汁", bones: "無刺", cooking: ["煮湯", "酥炸"] },
  { id: "clam", name: "文蛤", alias: ["蛤"], market: 200,
    texture: "湯汁鮮美", bones: "無刺", cooking: ["煮湯", "炒"] },
  { id: "milkfish", name: "虱目魚", alias: [], market: 180,
    texture: "肉質細緻", bones: "細刺多", cooking: ["煮湯", "煎"] },
  { id: "eel", name: "鰻魚", alias: [], market: 900,
    texture: "油脂豐富", bones: "細刺多", cooking: ["蒲燒", "烤"] },
  { id: "sweetfish", name: "香魚", alias: [], market: 600,
    texture: "肉質細嫩", bones: "細刺多", cooking: ["鹽烤"] }
];

export const TAIWAN_REGIONS = [
  "基隆市", "臺北市", "新北市", "桃園市", "新竹市", "新竹縣", "苗栗縣",
  "臺中市", "彰化縣", "南投縣", "雲林縣", "嘉義市", "嘉義縣", "臺南市",
  "高雄市", "屏東縣", "宜蘭縣", "花蓮縣", "臺東縣", "澎湖縣", "金門縣", "連江縣"
];

/* 取文字中最長的魚種名稱或別名，避免「石斑」誤蓋「玳瑁石斑」。 */
export function findSpecies(text) {
  const source = String(text || "");
  let best = null;
  let bestLength = 0;
  for (const spice of SPECIES) {
    const names = [spice.name].concat(spice.alias);
    for (const name of names) {
      if (source.indexOf(name) !== -1 && name.length > bestLength) {
        best = spice;
        bestLength = name.length;
      }
    }
  }
  return best;
}

export function findRegion(text) {
  const normalized = String(text || "").replace(/台/g, "臺");
  const hits = TAIWAN_REGIONS.filter(function (region) {
    const short = region.replace(/[市縣]$/, "");
    return normalized.indexOf(region) !== -1 || normalized.indexOf(short) !== -1;
  });
  hits.sort(function (a, b) { return b.length - a.length; });
  return hits[0] || "";
}
