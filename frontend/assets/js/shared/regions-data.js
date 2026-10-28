/* 縣市清單與文字正規化（唯一來源）：classic 腳本與 ES module 都載入這一份。 */
(function (root) {
  root.TAIWAN_REGIONS = [
    "基隆市", "台北市", "新北市", "桃園市", "新竹市", "新竹縣",
    "苗栗縣", "台中市", "彰化縣", "南投縣", "雲林縣", "嘉義市",
    "嘉義縣", "台南市", "高雄市", "屏東縣", "宜蘭縣", "花蓮縣",
    "台東縣", "澎湖縣", "金門縣", "連江縣"
  ];

  root.HaisenRegionText = {
    /* 顯示與比對統一用「台」，並容納舊資料的「臺」。 */
    normalizeCityName: function (value) {
      return String(value || "").replace(/臺/g, "台");
    }
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
