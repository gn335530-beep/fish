/* 魚種參考資料（唯一來源）：名稱、別名、行情與料理屬性。
   market 為元／台斤，僅供內部定價參考，不對外 API 回傳。 */

const SPECIES = [
  { id: "amberjack", category: "fish", name: "紅魽", latin: "Seriola dumerili", market: 486, alias: ["紅甘", "紅魽魚"],
    texture: "油脂豐富、肉質彈牙", bones: "細刺少", cooking: ["生魚片", "香煎", "炙燒"] },
  { id: "seabream", category: "fish", name: "嘉鱲", latin: "Pagrus major", market: 648, alias: ["真鯛", "嘉鱲魚", "嘉鱲（真鯛）", "加鱲"],
    texture: "肉質細緻、甜度高", bones: "刺少", cooking: ["清蒸", "煮湯", "鹽烤"] },
  { id: "grouper", category: "fish", name: "玳瑁石斑", latin: "Epinephelus quoyanus", market: 742, alias: ["石斑", "石斑魚"],
    texture: "肉質緊實、膠質多", bones: "細刺少", cooking: ["清蒸", "煮湯", "紅燒"] },
  { id: "tuna", category: "fish", name: "黑鮪", latin: "Thunnus thynnus", market: 1580, alias: ["黑鮪魚", "鮪魚"],
    texture: "油花均勻、入口即化", bones: "刺少", cooking: ["生魚片", "香煎"] },
  { id: "seabass", category: "fish", name: "海鱸", latin: "Lateolabrax japonicus", market: 402, alias: ["鱸魚"],
    texture: "肉質細嫩、味道清淡", bones: "刺少", cooking: ["清蒸", "煮湯"] },
  { id: "mackerel", category: "fish", name: "白腹鯖", latin: "Scomber japonicus", market: 168, alias: ["鯖魚"],
    texture: "油脂豐富、風味濃", bones: "細刺較多", cooking: ["鹽烤", "煎"] },
  { id: "squid", category: "ceph", name: "澎湖小卷", latin: "Sepioteuthis lessoniana", market: 392, alias: ["小卷", "軟絲", "透抽"],
    texture: "口感脆彈", bones: "無刺", cooking: ["川燙", "三杯", "烤"] },
  { id: "redseabream", category: "fish", name: "赤鯮", latin: "Dentex tumifrons", market: 560, alias: [],
    texture: "肉質細緻", bones: "刺少", cooking: ["清蒸", "煮湯"] },
  { id: "blackbream", category: "fish", name: "黑鯛", latin: "Acanthopagrus schlegelii", market: 380, alias: ["黑格"],
    texture: "肉質緊實", bones: "刺少", cooking: ["清蒸", "紅燒"] },
  { id: "yellowfin", category: "fish", name: "黃鰭鮪", latin: "Thunnus albacares", market: 620, alias: [],
    texture: "肉質扎實", bones: "刺少", cooking: ["生魚片", "煎"] },
  { id: "dolphinfish", category: "fish", name: "鬼頭刀", latin: "Coryphaena hippurus", market: 220, alias: [],
    texture: "肉質結實", bones: "刺少", cooking: ["煎", "紅燒"] },
  { id: "scad", category: "fish", name: "竹筴魚", latin: "Trachurus japonicus", market: 150, alias: ["巴攏"],
    texture: "油脂適中", bones: "細刺多", cooking: ["鹽烤", "煎"] },
  { id: "ribbonfish", category: "fish", name: "白帶魚", latin: "Trichiurus lepturus", market: 240, alias: [],
    texture: "肉質細軟", bones: "刺多", cooking: ["乾煎", "紅燒"] },
  { id: "threadfin", category: "fish", name: "午仔魚", latin: "Eleutheronema tetradactylum", market: 420, alias: [],
    texture: "肉質細嫩、油脂高", bones: "刺少", cooking: ["清蒸", "煎"] },
  { id: "bigeye", category: "fish", name: "紅目鰱", latin: "Priacanthus macracanthus", market: 300, alias: [],
    texture: "肉質細緻", bones: "刺少", cooking: ["煮湯", "清蒸"] },
  { id: "tilefish", category: "fish", name: "馬頭魚", latin: "Branchiostegus japonicus", market: 520, alias: [],
    texture: "肉質細白", bones: "刺少", cooking: ["清蒸", "煮湯"] },
  { id: "rockfish", category: "fish", name: "石狗公", latin: "Sebastiscus marmoratus", market: 340, alias: [],
    texture: "肉質緊實", bones: "刺少", cooking: ["煮湯"] },
  { id: "leatherjacket", category: "fish", name: "剝皮魚", latin: "Thamnaconus modestus", market: 260, alias: [],
    texture: "肉質清甜", bones: "刺少", cooking: ["煮湯", "煎"] },
  { id: "cuttlefish", category: "ceph", name: "花枝", latin: "Sepia esculenta", market: 360, alias: [],
    texture: "口感脆彈", bones: "無刺", cooking: ["炒", "川燙"] },
  { id: "octopus", category: "ceph", name: "章魚", latin: "Octopus vulgaris", market: 480, alias: [],
    texture: "口感彈牙", bones: "無刺", cooking: ["涼拌", "滷"] },
  { id: "lobster", category: "shellfish", name: "龍蝦", latin: "Panulirus ornatus", market: 1800, alias: [],
    texture: "肉質緊實鮮甜", bones: "無刺", cooking: ["清蒸", "煮湯"] },
  { id: "crab", category: "shellfish", name: "三點蟹", latin: "Portunus sanguinolentus", market: 520, alias: [],
    texture: "肉質細緻", bones: "無刺", cooking: ["清蒸", "炒"] },
  { id: "shrimp", category: "shellfish", name: "白蝦", latin: "Litopenaeus vannamei", market: 380, alias: ["蝦"],
    texture: "口感脆甜", bones: "無刺", cooking: ["川燙", "炒"] },
  { id: "oyster", category: "shellfish", name: "牡蠣", latin: "Crassostrea gigas", market: 280, alias: ["蚵"],
    texture: "鮮甜多汁", bones: "無刺", cooking: ["煮湯", "酥炸"] },
  { id: "clam", category: "shellfish", name: "文蛤", latin: "Meretrix lusoria", market: 200, alias: ["蛤"],
    texture: "湯汁鮮美", bones: "無刺", cooking: ["煮湯", "炒"] },
  { id: "milkfish", category: "fish", name: "虱目魚", latin: "Chanos chanos", market: 180, alias: [],
    texture: "肉質細緻", bones: "細刺多", cooking: ["煮湯", "煎"] },
  { id: "eel", category: "fish", name: "鰻魚", latin: "Anguilla japonica", market: 900, alias: [],
    texture: "油脂豐富", bones: "細刺多", cooking: ["蒲燒", "烤"] },
  { id: "sweetfish", category: "fish", name: "香魚", latin: "Plecoglossus altivelis", market: 600, alias: [],
    texture: "肉質細嫩", bones: "細刺多", cooking: ["鹽烤"] }
];

function byId(id) {
  if (!id) return null;
  return SPECIES.find(function (sp) { return sp.id === id; }) || null;
}

/* 以名稱、學名或完整別名比對；不做模糊比對，未知魚種回 null。 */
function byName(name) {
  if (!name) return null;
  const text = String(name).trim();
  return SPECIES.find(function (sp) {
    return text === sp.name || text === sp.latin || sp.alias.indexOf(text) !== -1;
  }) || null;
}

module.exports = { SPECIES: SPECIES, byId: byId, byName: byName };
