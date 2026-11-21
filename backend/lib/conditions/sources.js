/* 在地工具來源：只列實際取得的資料來源，供來源請求回傳。 */

const WEATHER_FORECAST_SOURCE = {
  title: "中央氣象署天氣預報",
  url: "https://www.cwa.gov.tw/V8/C/W/County/index.html"
};
const WEATHER_OBSERVATION_SOURCE = {
  title: "中央氣象署自動氣象站觀測",
  url: "https://www.cwa.gov.tw/V8/C/W/OBS_Station.html"
};
const MARINE_SOURCE = {
  title: "Open-Meteo 海況",
  url: "https://open-meteo.com/en/docs/marine-weather-api"
};
const TIDE_SOURCE = {
  title: "中央氣象署潮汐預報",
  url: "https://www.cwa.gov.tw/V8/C/M/tide.html"
};

function localSourceRows(local) {
  if (!local) return [];
  const rows = [];
  if (local.mode === "sea") {
    if (local.marine) rows.push(MARINE_SOURCE);
    if (local.weather) rows.push({
      title: "Open-Meteo 天氣",
      url: "https://open-meteo.com/"
    });
    if (local.tide) rows.push(TIDE_SOURCE);
  } else if (local.weather) {
    rows.push(WEATHER_FORECAST_SOURCE);
    if (local.observation) rows.push(WEATHER_OBSERVATION_SOURCE);
  }
  return rows.slice(0, 3);
}

module.exports = { localSourceRows: localSourceRows };
