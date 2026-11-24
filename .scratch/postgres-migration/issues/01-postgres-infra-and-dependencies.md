# 01: Postgres 基建與依賴

**What to build:** 用 docker compose 起一個健康的 PostgreSQL 16，並把連線設定與驅動依賴準備好。這個 ticket 只新增基礎設施；app 仍跑在原本的 lowdb，所有 API 行為完全不變。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `docker compose up -d db` 起一個健康的 Postgres 16，具名 volume、healthcheck（`pg_isready`）
- [ ] `DATABASE_URL` 寫進 `.env.example`；`.env` 仍不進版控
- [ ] `pg` 與 `express` 成為直接依賴；`json-server` 暫時保留
- [ ] `npm run backend` 仍以 lowdb 提供所有既有 API，行為不變
- [ ] 重啟 db 容器後資料仍在（volume 生效）
