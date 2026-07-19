# Save 数据恢复

本文说明如何通过公开 Persistence UI/port 恢复玩家进度。Save 是带来源和完整性证明的版本化数据，
不是可手改 JSON；DebugBundle 也不是 Save。

## 前置条件

- 先使用“导出当前进度”保存 live Snapshot。`exportCurrentSave()` 不依赖 IndexedDB 或写 lease，是
  storage unavailable/quota failure 时的救援路径。
- 记录四个 slot summary、Persistence status、lease 状态和首个 operation result；不要先 clear。
- 当前 Artifact 的 Story/state-contract/engine/simulation identity 必须与候选 Save exact-compatible，或
  存在精确的 resolved PatchSet adoption declaration。当前 runtime 没有通用旧格式迁移器。
- 所有操作都走 PlayerPersistencePort。不得直接编辑 IndexedDB、record revision、digest、provenance、
  simulation lineage 或 Save bytes。
- load/import 是 Session replacement，不要求写 lease；save、clear 和 Auto write 必须拥有当前有效
  fencing token。

## 精确命令

验证公开 persistence、fixture 和 Story 恢复合同：

```bash
pnpm --filter @sillymaker/base run test:runtime
pnpm --filter @project-tavern/story-e2e run test:runtime
pnpm --filter @project-tavern/story-poc run test
pnpm verify:runtime-fixtures
pnpm verify:fixtures
pnpm verify:docs
```

四个物理槽位的语义是：

| 槽位            | 写入者      | 用途                                     |
| --------------- | ----------- | ---------------------------------------- |
| `auto.current`  | Auto policy | 最新成功提交后的自动存档                 |
| `auto.previous` | Auto policy | 轮转前的有效 current，只作为显式恢复候选 |
| `quick`         | 玩家        | 明确执行 Quick Save 的结果               |
| `manual`        | 玩家        | 明确执行 Manual Save 的结果              |

`listSlots()` 固定按 `auto.current → auto.previous → quick → manual` 展示，但这不是自动加载优先级。
建议恢复流程：

1. 导出当前 live Snapshot，并保存文件 digest/size。
2. 刷新四槽 summary，比较 health、warning codes、`savedAt` 和 `capturedCommandSequence`。
3. `auto.current` 可运行时，经明确确认加载它。
4. current 不可运行且 previous 可运行时，`auto.previous` 才会标记为 `recovery_candidate`；经明确
   确认后加载。它永不自动加载、提升或覆盖 current。
5. 否则由玩家根据意图和证据选择 quick/manual；两者没有规范规定的自动优先级。
6. 文件 import 成功只替换当前 Session，不写物理槽位；如需持久化，再明确保存到 quick/manual。
7. 只有救援导出完成且用户明确确认永久删除后，才 clear 对应槽位。

输入验证顺序必须严格保持：

`bytes → Strict JSON → envelope Schema → state digest → compatibility/adoption → stable references → invariants`

原始 Save 上限为 5 MiB。普通 load 要求 Story ID/revision、state-contract revision/digest、engine digest
和 simulation digest 精确匹配。只有 simulation digest 是唯一阻断差异、其余身份相同、lineage 未超限，
且 adoption declaration 精确绑定 from/to simulation 与完整 simulation PatchSet digest 时，才可能
`adopted`。

## 预期输出

- summary 的 `valid` 只表示 record/slot 层健康；最终必须得到 `loaded`/`imported` 且 compatibility 为
  `exact` 或 `adopted`，不能把 `valid` 当作可运行保证。
- 成功 load/import 原子替换 Snapshot，保留 RunIntegrity，建立新 replay base 并清空旧 CommandLog；
  adopted 另外追加 simulation lineage。
- 失败 load/import 不改变 Session、replay base、CommandLog 或任何物理槽位。
- Auto rotation 在一个 compare-and-swap batch 内重编码 `auto.previous`、写 `auto.current` 并 touch
  lease；current 缺失/损坏时不会删除已有有效 previous。
- Quick/Manual 同时比较 Host revision 与 Save `recordRevision`；stale fencing token 永远不能提交。
- `exportCurrentSave()` 在 IndexedDB unavailable 时仍返回 `application/json` 文件。

## 失败证据

保留 slot ID、health、warning codes、record revision、`savedAt`、command sequence、当前 Artifact
provenance，以及 operation 的 `kind/code`。写入争议还要记录 lease kind、owner、fencing token 和
handoff request；不要把完整 Save 上传到公开 issue。

常见拒绝为：

```text
busy | unavailable | empty_slot | conflict
invalid_record | lineage_limit | incompatible
```

`conflict`、`invalid_record` 或 `incompatible` 重现时，保留原文件和 store，不要用 takeover/clear
制造一个看似绿色的重试。

## 停止条件

- lease owner 来源不明、handoff 有争议、stale fence 或 compare-and-swap conflict 重现；
- state digest、stable reference、invariant、identity 或 lineage validation 失败；
- 缺少精确 adoption declaration，或需要改变 state contract/新增迁移器；
- storage unavailable 且尚未完成 live rescue export；
- 用户尚未确认永久 clear，或 quick/manual 的选择意图不明确；
- 需要手改 JSON/IndexedDB、重算 provenance、把 previous 自动提升为 current，或把 DebugBundle 当 Save；
- 任何候选要求绕过验证。此时不得强行载入。

## 权威边界

Runtime codec 决定 bytes/Schema/digest，当前 Story validators 决定 stable references/invariants，精确
PatchSet declaration 决定 adoption eligibility，GameSession FIFO 拥有原子 replacement。Host
repository 的 lease、fencing 和 compare-and-swap 只保证物理写入并发安全；BroadcastChannel 只改善
UX，不是正确性边界。Operator 可以 list/export/load/import/clear，但不能自行批准 adoption、修改
identity、自动提升 previous 或把 import 成功误认为已经持久化。
