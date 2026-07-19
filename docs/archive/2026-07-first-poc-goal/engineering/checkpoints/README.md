# 工程 Checkpoints

本目录仅保留给 phase plan 明确要求的 tracked checkpoint。默认 phase checkpoint 是“最后一个 accepted task commit + 当前通过的 phase acceptance gate + clean worktree status”，不创建文件或独立 commit。目录本身不表示任何 phase 已完成。

若 phase plan 明确列出 checkpoint 文件、写入步骤、暂存集合和 commit message，该文件至少记录：

- Goal/phase base、最后 accepted task、当前 `HEAD`；
- phase/task ID 与实际执行命令和结果；
- 适用的 contract、fixture、golden、source graph、visual 或 Artifact digest；
- materialization digest 与适用的本机环境 fingerprint；
- 完整工作树状态和保留的用户改动；
- 下一 phase plan 与第一个未执行 task。

Checkpoint 文件是只读验证的输入或人工可审查证据。没有上述完整计划合同时，执行者不得自行在本目录增加文件。普通 `pnpm verify` 不得生成、更新或“接受”它们。
