# Project Tavern 工具链与仓库静态检查简化设计

**日期：** 2026-07-12
**状态：** 已确认，等待实施计划
**适用范围：** 根工作区、六阶段实施计划、项目法律文件与 Player 发布产物

## 1. 目的

Project Tavern 使用标准 Node.js、pnpm、TypeScript、Vite 和 Playwright 工具链。仓库不再把某一个 Node.js 或 pnpm 补丁版本当作可重复构建或代码正确性的必要条件，也不再用脚本证明项目自有法律文件、package license metadata 或测试截图 sidecar 没有被删除或修改。

本次调整删除机械式静态治理闸门，同时保留能够发现真实编译、运行时、确定性、架构边界、构建和发布错误的验证。

## 2. 工具链政策

根 `package.json` 只声明最低运行要求：

```json
{
  "engines": {
    "node": ">=22.12.0",
    "pnpm": ">=11.0.0"
  }
}
```

- 删除 `.node-version`；仓库不指定本机 Node.js 补丁版本。
- 删除根 `package.json.packageManager` 的精确 pnpm 版本声明。
- 删除 `.npmrc` 的 `engine-strict=true`；`engines` 是兼容性说明，不是安装阻断器。
- 删除 `verify:toolchain`、`scripts/verify-toolchain.mjs` 及其测试。
- 不再比较实际 Node.js、pnpm 或 TypeScript 版本与固定常量。
- 依赖版本仍使用精确 manifest 和 lockfile；`pnpm install --frozen-lockfile` 继续负责依赖图重现性。
- `save-exact`、strict peer dependency 和共享 workspace lockfile 设置继续保留；它们管理依赖图，不限制本机运行环境。
- TypeScript 仍以根 `devDependencies` 中安装的版本执行正式类型检查，但不新增脚本证明该版本等于文档常量。

最低 Node.js 版本取当前 Vite 8 工具链支持范围中的 Node 22 分支下限，并覆盖仓库当前使用的 Node 原生 TypeScript 执行能力。最低 pnpm 版本取当前 workspace 已采用的主版本下限。

## 3. 仓库法律文件政策

删除 `verify:licensing`、`scripts/verify-licensing.mjs` 及其测试。仓库不再自动检查：

- 项目法律文件是否存在或内容哈希是否等于固定值；
- `NOTICE` 是否包含固定文本；
- workspace package 的 `license` metadata 是否等于脚本内清单；
- E2E 截图是否存在逐文件 license sidecar；
- `references/` 是否被 Git 跟踪。

相应地，删除现有 `sandbox-shell.png.license.json`。项目法律文件、package metadata 和 `.gitignore` 仍由维护者按仓库政策直接维护和评审，但不通过专用脚本冻结。

这项简化不会引入 npm 依赖、`vendor/**`、AIGC、素材或第三方文件扫描，也不会生成第三方许可证清单。

## 4. Player 发布产物

Player artifact 继续携带项目自身的发布声明：

- `LICENSE.md`
- `NOTICE`
- `LICENSES/MIT.txt`
- `LICENSES/PolyForm-Noncommercial-1.0.0.txt`
- `LICENSES/CC-BY-NC-SA-4.0.txt`
- `THIRD_PARTY_NOTICES.md`
- `TRADEMARKS.md`

`CONTRIBUTING.md` 不属于游戏运行产物，不再复制到 Player artifact。

artifact 验证只确认上述项目文件被构建流程复制且进入技术 manifest。它不冻结这些文件的内容哈希、不对其法律含义做判断，也不扫描依赖、vendor、AIGC 或普通素材。技术 manifest 仍按原始字节计算 digest，以验证发布产物完整性和双构建可重现性；这是构建身份，不是版权审计。

## 5. 保留的验证

以下验证继续保留：

- format、lint、TypeScript typecheck 和 workspace build；
- Base public export、模块导入边界和循环依赖；
- Story、fixture、golden、balance、asset manifest 和 UI 测试；
- 确定性模拟、事务、CommandLog、存档与重放契约；
- Player/Developer bundle 隔离；
- artifact 相对 base、路径、文件 digest、嵌套部署和双构建可重现性；
- Chromium/WebKit E2E。

这些验证必须证明可观察的软件行为或发布产物结构，不承担环境版本取证或许可证审计职责。

## 6. 文档与计划迁移

实施时同步更新 `AGENTS.md`、`README.md`、`docs/README.md`、Harness/许可权威规格、PoC roadmap 和六份阶段计划：

- 把精确 Node.js/pnpm 语言改为最低版本声明；
- 删除 `verify:toolchain` 和 `verify:licensing` 命令、测试、任务文件及验收要求；
- 后续新增 workspace package 时直接维护 package metadata，不再扩展许可验证器；
- 保留 frozen lockfile、精确依赖版本和所有行为验证；
- 保留 Player artifact 的项目声明携带要求，但明确它不是第三方或逐文件许可扫描。

历史提交无需改写。所有后续阶段从更新后的权威规格和计划继续执行。

## 7. 验收标准

- 根 package 只声明 Node.js 和 pnpm 最低版本，不存在精确环境版本闸门。
- 仓库不存在 `verify-toolchain*`、`verify-licensing*` 或截图 license sidecar。
- `pnpm verify` 不调用上述命令，但仍运行全部保留的行为验证。
- Player artifact 包含七个项目发布声明文件，不包含 `CONTRIBUTING.md`。
- 依赖安装仍可使用 frozen lockfile，类型检查、单元/契约/属性测试、E2E、构建、artifact 和 release reproducibility 全部通过。
- 权威规格、六阶段计划和开发指引不再要求已删除的脚本或精确环境补丁版本。

## 8. 非目标

- 不放宽 TypeScript strictness、模块边界、确定性或存档/重放契约。
- 不删除 fixture、golden 或 E2E 基线；它们验证游戏行为，而不是仓库治理文本。
- 不把依赖版本改成宽松范围，不删除 lockfile，也不取消 frozen install。
- 不改变项目采用的 MIT、PolyForm Noncommercial、CC BY-NC-SA 或商标政策本身。
