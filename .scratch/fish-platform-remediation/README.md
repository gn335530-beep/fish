# fish-platform remediation tickets

- 來源：`.scratch/fish-platform/remediation-plan.md`（審查固定點 `origin/master` 38e20ec → `HEAD` d2548a5）
- 這批 26 張把計畫的 S1–S8、D1–D7、R1–R10 拆成可獨立驗收的票；R10 併入 D1 第一階段。26 是 10 的後續結構票。
- 一 ticket 一檔：`issues/NN-<slug>.md`，從 `01` 編號。
- `Blocked by` 只用本目錄編號；編號順序保證 blocker 在前。
- 每張票的 `Source` 指向計畫對應段落；該段有檔案與行號證據。票內刻意不重抄檔案路徑，避免過期。
- 三波順序：`01–08` 行為修正、`09–16` 標準與文件、`17–25` 重構；`26` 為後續結構票。
- 前線：除了 `06`、`22`、`24`、`26` 以外都可開始。`06` 等 `04`；`22` 等 `09`；`24` 等 `17`、`19`；`26` 等 `10`。
- 2026-10-27 決定：`10` 採 C（丟棄本機 `db.json` 變更）並直接刪除 `completed_orders`；seed/runtime 分離另見 `26`。
- 既有 `fish-platform` 票 21–34 的 Status 仍為 `ready-for-human`，不屬本批；若要做 housekeeping 另開票。
