const TODAY_CATCH = ["amberjack","seabream","grouper","tuna"];
renderCatchCards("today-catch", TODAY_CATCH);
/* [資料綁定] 後端漁獲載入完成後重繪首頁「今日漁獲」。 */
document.addEventListener("haisen:catch-ready", ()=> renderCatchCards("today-catch", TODAY_CATCH));
