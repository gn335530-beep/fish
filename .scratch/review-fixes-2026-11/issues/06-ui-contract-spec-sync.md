# 06: 同步商品卡照片比例與交易房面板行為的 spec

**What to build:** 保留目前商品卡照片 3:2 與交易房面板展開後取代商品條的行為，不改程式；更新交易房 spec 與 tickets，讓 §2 的照片比例、§6／§7 的面板行為，以及 ticket 02／08 的驗收條件與現況一致。同步確認 UI 規格已反映這兩個決策。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 交易房 spec §2 的照片比例改為 3:2。
- [x] §6／§7 的面板行為改為「展開後取代商品條」，與 ticket 08 一致。
- [x] ticket 02／08 的 Comments 記錄新契約（3:2／面板取代商品條），不篡改已完成的 checklist。
- [x] UI 規格沒有殘留 4:5 或「容器長高」的舊描述。

## Comments

- 2026-11-10：交易房 spec 的摘要、§2、§6、§7 與加購 §8 統一為 `aspect-ratio: 3/2` 與「面板展開後取代商品條，面板內提供收起／底部取消確認」；`docs/spec/03-flows.md` 與 ticket 10 也同步。ticket 02、08、10 各補一則 Comments 記錄目前契約，原 checklist 不動。`docs/spec/06-ui.md` 已確認照片為 3:2、面板展開後取代商品條，沒有 4:5 或容器長高殘留。程式與版面未改。
