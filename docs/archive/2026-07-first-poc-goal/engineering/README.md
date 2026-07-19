# 工程文档

本目录保存 SillyMaker 与 Project Tavern 当前有效的工程规格、执行计划和执行证据。它不依赖任何 Codex、Superpowers 或其他 workflow plugin；目录已从历史工具名迁移为中性的 `docs/engineering/`。

## 入口

- 启动或恢复自动化工程工作：先读 [`GOAL.md`](GOAL.md)。
- 通用任务、提交、恢复与停止规则：[`execution-protocol.md`](execution-protocol.md)。
- 阶段顺序和完整 Definition of Done：[`plans/2026-07-11-project-tavern-poc-roadmap.md`](plans/2026-07-11-project-tavern-poc-roadmap.md)。
- 机器可读的封闭计划集合：[`plan-set.v1.json`](plan-set.v1.json)。
- 领域权威合同：[`specs/`](specs/)。
- 后续执行产生的阶段证据：[`checkpoints/`](checkpoints/)。

`plans/` 中的复选框描述必须执行的步骤，不是持久进度。实际进度只由已验收的 task commit、phase checkpoint、只读 gate 和当前 Git 状态共同确定。

## 目录职责

```text
docs/engineering/
  GOAL.md                 # 唯一的 Goal 启动与恢复入口
  execution-protocol.md   # 所有阶段共享的执行纪律
  plan-set.v1.json        # 阶段、依赖和范围的机器可读清单
  plans/                  # Phase 0、2–6、人工审查与 deferred 分发计划
  specs/                  # 架构、合同、许可与交付边界
  checkpoints/            # 执行期间新增的可复核证据
```

产品方向、PoC 玩法、素材和研究文档仍由 [`../README.md`](../README.md) 统一索引。
