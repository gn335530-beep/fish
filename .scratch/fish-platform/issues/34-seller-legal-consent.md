# 34: 販賣法規告知與第一次販賣確認

**What to build:** 在登入／註冊頁左側（釣客／買家文案下方）顯示漁業法與證照告知，附「漁業法」連結；同時修正左側文案的「現流」「澎湖魚市」「下單」，並刪除「隔日清晨低溫直送」。第一次觸發販賣意圖時，助手先顯示法規告知卡，使用者按「我已了解並確認」後才進入上架；按「取消」則回 idle。確認一次永久有效，不因法規文字更新重問。法規卡只是 UI；同意只由 `POST /api/users/seller-consent` 寫入。`context` 用 `pending_sale_text` 暫存觸發販賣的原句、`awaiting_consent` 標記等待確認。接在 #29 的上架流程前面。（規格：G-23、AC-16～AC-19、F1、F2 步驟 0、B-10）

**Blocked by:** 29、32

**Status:** ready-for-agent

- [ ] 登入／註冊頁左側（兩個 tab 都顯示）有法規告知：販賣魚貨（一支釣）需依照法規申請相關合法證照；未申請可依法開罰新臺幣三萬元以上三十萬元以下罰鍰。
- [ ] 「漁業法」連結指向 `https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=M0050001`，另開新視窗。
- [ ] 左側文案修正：「現流」→「當日漁獲」、「澎湖魚市」→「官方行情」、「下單」→「洽談後成立訂單」；刪除「隔日清晨低溫直送」。
- [ ] `users` 新增 `seller_terms_accepted_at`；`POST /api/users/seller-consent` 記錄時間，重複呼叫不覆寫第一次時間；`GET /api/auth/me` 會回傳。
- [ ] 第一次販賣意圖（我要賣魚、我要賣花枝、出售、剛釣到…）先顯示法規告知卡，不問重量、不建立草稿；原句寫入 `pending_sale_text`、`awaiting_consent = true`。
- [ ] 卡片有「我已了解並確認」與「取消」；確認成功後清空 `pending_sale_text`、`awaiting_consent = false`，並用原始句子接回上架；取消則回 idle、清空待販賣狀態、不記錄同意。
- [ ] 已確認的使用者再賣魚不再顯示法規告知。
- [ ] 買方、瀏覽與諮詢不受影響。
- [ ] `legal_consent` 卡片型別加進資料模型與前端渲染；連結另開新視窗、按鈕有無障礙標籤。
- [ ] 法規文案不得寫成保證合法或代辦證照；同意只由 `seller-consent` 端點寫入，`chat/message` 的卡片不寫同意。
- [ ] 測試、01／02／03／04／05／06／07、glossary 與 ticket 同步。
