# 05: 文件同步：ADR 與 spec 反映代碼優先

**What to build:** 更新 ADR-0011 與 `docs/spec/03-flows.md`，使「魚種槽位模型優先」條目明確反映「`species_code` 也優先採用、規則式抽取只在模型未提供時補足」，與程式行為一致。

**Blocked by:** 02（行情代碼優先）、03（導購代碼優先）

**Status:** resolved

- [x] ADR-0011 的魚種槽位條目明列 `species_code` 優先
- [x] `docs/spec/03-flows.md` 對應條目與 ADR 一致
- [x] 文件描述與實際程式行為相符（行情／導購依代碼優先、上架維持模型優先）

## Comments

2026-11-24 完成。ADR-0011 的決策條目與 Consequences 都補上「同時提供時以 `species_code` 為準（行情依代碼查價、導購以代碼對應官方名稱篩選）」；`docs/spec/03-flows.md` 的平台魚種槽位條目同步相同措辭。文件與 02／03 的實作一致。
