# Project Tavern Remote Distribution — Deferred Scope

状态：明确 defer；不属于第一轮 Phase 2–6 工程 Goal，也不是当前可执行实施计划

## 未来目标

未来按实际试玩需求选择一个或多个分发适配器，例如 GitHub Actions + GitHub Pages、Cloudflare Pages/Workers、Electron 或其他静态托管/客户端包装。选择目标前不预建 workflow、SDK、权限、域名、缓存或 remote smoke 合同。

## 固定输入边界

远端任务只能消费本地工程轨道已经通过验证的 exact `dist/poc`、source SHA、build-input 和 artifact manifest。任何适配器都不得重新构建或修改部署 bytes，不得把目标特定依赖、凭据或 API 引回 Base/UI/Story。

## 未来必须单独设计的内容

- 目标选择与成本/权限/缓存模型；
- CI 与构建制品传递；
- 凭据、最小权限、保护环境和审批；
- 上传、原子切换、identity polling 和 remote smoke；
- URL/base/routing/header/CSP/压缩策略；
- observability、失败证据、隐私和保留期；
- 前向修复或目标支持的回滚策略；
- 用户明确授权后的首次发布。

在这份独立设计和实施计划获批前，仓库主线不得创建 `.github/workflows/**`、Cloudflare 配置、远端发布脚本或 hosting dependency；本地 Definition of Done 也不得声称任何远端地址可用。
