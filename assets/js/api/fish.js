(function () {
  "use strict";
  var API = window.HaisenAPI;
  async function listFish() {
    // [API 對接點] 取得所有漁獲
    // METHOD  : GET
    // ENDPOINT: /api/fish/data
    // 回應    : { success, message, data: [FishData] }
    var data = await API.request("/api/fish/data", {});
    return (data && data.data) || [];
  }

  async function createFish(listing) {
    // [API 對接點] 新增漁獲（上架）
    // METHOD  : POST
    // ENDPOINT: /api/fish/data
    // HEADERS : Authorization: Bearer <token>
    // PARAMS  : { fish_type, quantity, weight, price_per_taijin, price_per_kg,
    //             species_id, species_latin, region, sea, location, caught_time,
    //             process, process_note, shipping[], payment[], deposit_on,
    //             deposit_amount, images[], tail_weights[], weight_mode, tags[] }
    // 回應    : { success, message, data:{ id, seller_id } }
    // 資料庫  : fish_data（seller_id 由 token 決定，非 body）
    return API.request("/api/fish/data", { method: "POST", body: listing, auth: true });
  }

  async function updateFish(id, patch) {
    // [API 對接點] 更新漁獲（售價/狀態/買家/實重…）
    // METHOD  : PUT
    // ENDPOINT: /api/fish/data/{id}
    // PARAMS  : 任意 fishUpdateRequest 欄位（未帶的欄位保持不變）
    return API.request("/api/fish/data/" + encodeURIComponent(id), { method: "PUT", body: patch, auth: true });
  }

  async function deleteFish(id) {
    // [API 對接點] 刪除漁獲
    // METHOD  : DELETE
    // ENDPOINT: /api/fish/data/{id}
    return API.request("/api/fish/data/" + encodeURIComponent(id), { method: "DELETE", auth: true });
  }
  Object.assign(API, { listFish: listFish, createFish: createFish, updateFish: updateFish, deleteFish: deleteFish });
})();
