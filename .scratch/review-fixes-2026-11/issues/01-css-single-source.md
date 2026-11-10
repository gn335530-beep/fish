# 01: 前置重構：聊天卡片與交易房 CSS 單一來源

**What to build:** 把聊天室卡片氣泡的重設規則收成一份，並移除已被新樣式覆蓋的舊選擇器與死樣式（包含舊商品條列與已不再輸出的加購列 class），讓後續調整只改一處。這是前置重構，畫面與行為不變；完成後聊天室、商品卡、協議卡與行情卡的外觀仍與現在相同。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 四份重複的卡片氣泡重設規則已收成單一來源。
- [x] 舊商品條列與加購列的 superseded／dead 選擇器已移除，沒有新舊規則互相覆蓋。
- [x] 聊天室、商品卡、協議卡與行情卡的外觀與現在一致。
- [x] `npm test` 通過，所有程式碼檔案不超過 200 行。

## Comments

- 2026-11-10：行情卡、推薦卡與協議卡的氣泡重設與寬度收進 `chat-bubbles.css`，三份卡片 CSS 不再重複定義。交易房樣式集中到 `deal-room-layout.css`（置頂容器、商品條、動作）與 `deal-room-sheets.css`（發送交易、加購、欄位），刪除已被覆蓋的 `deal-orders.css` 並移除三頁的載入連結。`deal-views.css` 只留提示、空狀態與收件匣，`deal-room.css` 只留評價卡；移除 `fm-addon__name`、舊商品條列與舊協議卡／取消卡選擇器。外觀沿用原本最終生效值。
