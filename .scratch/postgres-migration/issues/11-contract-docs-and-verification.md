# 11: 收斂與驗證：移除舊層、文件與端到端

**What to build:** 移除 json-server／lowdb 與 `db.json` 機制，讓啟動只剩顯式 async 初始化；同步更新文件與 ADR；最後在乾淨環境跑完整測試與端到端驗收。

**Blocked by:** 10

**Status:** ready-for-agent

- [ ] `json-server` 從依賴移除；lowdb 與「首次啟動複製 seed 成 `db.json`」機制刪除
- [ ] app 只透過 `DATABASE_URL` 連 Postgres，啟動流程只剩 async 初始化
- [ ] `docs/spec/01-overview.md`、`04-data-model.md`、`05-api.md`、`07-roadmap.md`、`backend/README.md`、`README.md` 與程式一致
- [ ] 新增 ADR-0016：PostgreSQL＋JSONB 取代 json-server，記錄引擎、schema 形狀、同步→非同步與可讀 ID 的取捨
- [ ] 確認 `GLOSSARY.md` 不需改動（沒有新增領域概念）
- [ ] 乾淨環境 `npm test` 全綠
- [ ] Playwright e2e 通過
- [ ] spec 的驗收情境以手動清單走完（兩個瀏覽器的交易流程、行情、助手房、個人資訊）
- [ ] 所有程式碼檔案不超過 200 行
