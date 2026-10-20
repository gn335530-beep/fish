(function () {
  "use strict";
  var KG_TO_TAIJIN = 1 / 0.6;
  var TAIJIN_TO_KG = 0.6;
  function parseArr(s, fallback) {
    if (!s) return fallback;
    try { var v = JSON.parse(s); return Array.isArray(v) ? v : fallback; }
    catch (e) { return fallback; }
  }
  function matchSpeciesId(fishType, speciesList) {
    if (!fishType || !speciesList) return null;
    var name = String(fishType);
    for (var i = 0; i < speciesList.length; i++) {
      var sp = speciesList[i];
      if (name.indexOf(sp.name) !== -1 || sp.name.indexOf(name) !== -1) return sp.id;
    }
    return null;
  }
  function dateToCaught(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return "";
    var hh = String(d.getHours()).padStart(2, "0");
    var mm = String(d.getMinutes()).padStart(2, "0");
    return "今日 " + hh + ":" + mm + " 釣獲";
  }

  /**
   * 將後端 FishData 一列轉為新版 UI 的 CATCH 造型物件。
   * @param {object} row           後端 fish_data 列
   * @param {Array}  speciesList   SPECIES 陣列（提供 latin / market 均價 / 圖片）
   * @returns {object} { key, entry }
   */
  function rowToCatch(row, speciesList) {
    var isNew = Number(row.price_per_taijin) > 0;
    // 價格：新版以「元/台斤」顯示。舊資料只有 price_per_kg，換算成台斤。
    var priceTaijin = isNew
      ? Number(row.price_per_taijin)
      : Math.round(Number(row.price_per_kg || 0) * TAIJIN_TO_KG);
    var quantity = Number(row.quantity || 1);
    var tails = parseArr(row.tail_weights, []);
    // 舊資料的 weight 視為公斤，換算為台斤；新版直接是平均台斤重。
    var avgTaijin = isNew
      ? Number(row.weight || 0)
      : Math.round(Number(row.weight || 0) * KG_TO_TAIJIN * 10) / 10;
    var tailList = tails.length
      ? tails.map(function (w) { return { weight: Number(w) }; })
      : Array.from({ length: quantity }, function () { return { weight: avgTaijin }; });

    var speciesId = row.species_id || matchSpeciesId(row.fish_type, speciesList) || null;
    var sp = speciesId ? (speciesList || []).filter(function (s) { return s.id === speciesId; })[0] : null;

    var images = parseArr(row.images, []);
    var img = images.length ? images[0] : (sp ? "images/" + sp.id + ".png" : "images/catch-still.jpg");
      if (img.indexOf("images/") === 0) img = "../assets/" + img;

    var sellerName = (row.seller && (row.seller.display_name || row.seller.username)) || "釣客";
    var key = row.species_id || ("f" + row.id);

    var entry = {
      // --- 後端識別 ---
      inventoryId: row.id,
      speciesId: speciesId,
      status: row.status,
      // --- 顯示欄位（與 app.js 靜態 CATCH 同構） ---
      name: row.fish_type || (sp ? sp.name : "漁獲"),
      latin: row.species_latin || (sp ? sp.latin : ""),
      img: img,
      sea: row.sea || "",
      region: row.region || "",
      location: row.location || "",
      caught: row.caught_time ? ("今日 " + row.caught_time + " 釣獲") : dateToCaught(row.created_at),
      caughtShort: row.caught_time || "",
      unit: "台斤",
      tails: tailList,
      market: sp ? sp.market : priceTaijin,
      price: priceTaijin,
      remaining: String(row.status).toUpperCase() === "AVAILABLE" ? quantity : 0,
      process: row.process || "",
      processNote: row.process_note || "",
      shipping: parseArr(row.shipping, ["買家自取"]),
      payment: parseArr(row.payment, ["貨到付款"]),
      deposit: { on: !!row.deposit_on, amount: Number(row.deposit_amount || 0) },
      seller: {
        name: sellerName,
        region: row.region || "",
        location: row.location || "",
        rating: 4.8,
        deals: 0
      },
      tags: parseArr(row.tags, ["當日現流"]),
      note: row.process_note || ""
    };
    return { key: key, entry: entry };
  }

  /**
   * 批次轉換，回傳可直接 Object.assign 進 CATCH 的物件。
   */
  function rowsToCatch(rows, speciesList) {
    var out = {};
    (rows || []).forEach(function (row) {
      var r = rowToCatch(row, speciesList);
      if (r.key) out[r.key] = r.entry;
    });
    return out;
  }
  window.HaisenAPI.rowToCatch = rowToCatch;
  window.HaisenAPI.rowsToCatch = rowsToCatch;
  window.HaisenAPI.matchSpeciesId = matchSpeciesId;
})();
