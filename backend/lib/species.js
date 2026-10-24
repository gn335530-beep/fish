/* 魚種參考資料。market 為元／台斤，與資料庫價格單位一致。
   用於上架時的行情參考價與名稱比對。 */

const SPECIES = [
  { id: "amberjack", name: "紅魽", latin: "Seriola dumerili", market: 486, alias: ["紅甘", "紅魽魚"] },
  { id: "seabream", name: "嘉鱲", latin: "Pagrus major", market: 648, alias: ["真鯛", "嘉鱲魚", "嘉鱲（真鯛）"] },
  { id: "grouper", name: "玳瑁石斑", latin: "Epinephelus quoyanus", market: 742, alias: ["石斑", "石斑魚"] },
  { id: "tuna", name: "黑鮪", latin: "Thunnus thynnus", market: 1580, alias: ["黑鮪魚", "鮪魚"] },
  { id: "seabass", name: "海鱸", latin: "Lateolabrax japonicus", market: 402, alias: ["鱸魚"] },
  { id: "mackerel", name: "白腹鯖", latin: "Scomber japonicus", market: 168, alias: ["鯖魚"] },
  { id: "squid", name: "澎湖小卷", latin: "Sepioteuthis lessoniana", market: 392, alias: ["小卷", "軟絲"] },
  { id: "redseabream", name: "赤鯮", latin: "Dentex tumifrons", market: 560, alias: [] },
  { id: "blackbream", name: "黑鯛", latin: "Acanthopagrus schlegelii", market: 380, alias: ["黑格"] },
  { id: "yellowfin", name: "黃鰭鮪", latin: "Thunnus albacares", market: 620, alias: [] },
  { id: "dolphinfish", name: "鬼頭刀", latin: "Coryphaena hippurus", market: 220, alias: [] },
  { id: "scad", name: "竹筴魚", latin: "Trachurus japonicus", market: 150, alias: ["巴攏"] },
  { id: "ribbonfish", name: "白帶魚", latin: "Trichiurus lepturus", market: 240, alias: [] },
  { id: "threadfin", name: "午仔魚", latin: "Eleutheronema tetradactylum", market: 420, alias: [] },
  { id: "bigeye", name: "紅目鰱", latin: "Priacanthus macracanthus", market: 300, alias: [] },
  { id: "tilefish", name: "馬頭魚", latin: "Branchiostegus japonicus", market: 520, alias: [] },
  { id: "rockfish", name: "石狗公", latin: "Sebastiscus marmoratus", market: 340, alias: [] },
  { id: "leatherjacket", name: "剝皮魚", latin: "Thamnaconus modestus", market: 260, alias: [] },
  { id: "cuttlefish", name: "花枝", latin: "Sepia esculenta", market: 360, alias: [] },
  { id: "octopus", name: "章魚", latin: "Octopus vulgaris", market: 480, alias: [] },
  { id: "lobster", name: "龍蝦", latin: "Panulirus ornatus", market: 1800, alias: [] },
  { id: "crab", name: "三點蟹", latin: "Portunus sanguinolentus", market: 520, alias: [] },
  { id: "shrimp", name: "白蝦", latin: "Litopenaeus vannamei", market: 380, alias: ["蝦"] },
  { id: "oyster", name: "牡蠣", latin: "Crassostrea gigas", market: 280, alias: ["蚵"] },
  { id: "clam", name: "文蛤", latin: "Meretrix lusoria", market: 200, alias: ["蛤"] },
  { id: "milkfish", name: "虱目魚", latin: "Chanos chanos", market: 180, alias: [] },
  { id: "eel", name: "鰻魚", latin: "Anguilla japonica", market: 900, alias: [] },
  { id: "sweetfish", name: "香魚", latin: "Plecoglossus altivelis", market: 600, alias: [] }
];

function byId(id) {
  if (!id) return null;
  return SPECIES.find(function (sp) { return sp.id === id; }) || null;
}

/* 以名稱或別名比對，回傳單一魚種；比對不到回 null。 */
function byName(name) {
  if (!name) return null;
  const text = String(name).trim();
  return SPECIES.find(function (sp) {
    if (text === sp.name || text === sp.latin) return true;
    return sp.alias.some(function (a) { return text === a || text.indexOf(a) !== -1; });
  }) || null;
}

module.exports = { SPECIES: SPECIES, byId: byId, byName: byName };
