# 08: 行情與 AI 路由改 async

**What to build:** 把行情查詢、官方代碼字典與 AI 回覆的路由全部改為 await 非同步資料存取。

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] 行情與官方代碼字典路由的 handler 改為 async，並 await 行情邏輯
- [ ] AI 回覆路由改為 async，並 await AI 邏輯；交易房不呼叫 AI 的規則不變
- [ ] `LLM_ENABLED=false` 或缺少金鑰時，provider 呼叫次數為 0
- [ ] API 路徑、請求與回應格式、狀態碼、錯誤碼全部不變
- [ ] 這是整合分支的批次；整合綠燈在 ticket 10
