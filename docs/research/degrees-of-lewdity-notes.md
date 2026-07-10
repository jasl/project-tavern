# Degrees of Lewdity 工程研究笔记

日期：2026-07-10
来源：本地只读参考仓库 `references/degrees-of-lewdity`，revision `3ecf56d73`；登记信息见 `reference-register.md`
研究范围：网页文字游戏的时间、事件、状态、存档、构建与调试；不研究或复述成人内容

## 1. 结论

这个项目最值得借鉴的不是 SugarCube/Twine 写法，而是“大量内容长期增长后，团队不得不解决哪些工程问题”：

- 时间必须有唯一所有者；
- 周期 flag 需要明确生命周期；
- 事件候选、条件与随机选择必须能解释；
- 存档必须包含版本与随机状态；
- 内容需要专用静态检查；
- 开发者需要跳时间、强制事件、场景预览和存档比较工具。

我们应独立实现这些需求，不能继承它的全局状态、动态宏、隐式加载顺序和长期迁移包袱。

## 2. 许可证边界

参考仓库根目录 `LICENSE` 是 **Creative Commons Attribution-NonCommercial-ShareAlike 4.0**。其中包含非商业与相同方式共享条件。本项目未来保留商业发布可能，因此采取保守的独立重实现与污染控制边界：

- `references/` 整体由主仓库 `.gitignore` 排除；
- 不复制或改写其代码、宏、故事文本、资源、数据表、常量和独特 schema；
- 不以其文件作为代码生成模板；
- 只记录不受特定表达保护的通用工程需求与我们独立得出的设计；
- 新实现只依据本项目规格、测试和自己定义的接口完成；
- 生产构建、测试和代码生成不读取 `references/`；
- 若未来想直接使用任何素材或代码，必须先单独做许可证评估。

同一实现者仍然可以阅读参考资料，因此这不是真正的人员隔离式 clean-room 流程。这是一项项目卫生政策，不是法律意见；本研究笔记也不是实现规格。

## 3. 时间与日程

关键文件：

- `game/00-framework-tools/10-time/00-time-constants.js`
- `game/00-framework-tools/10-time/datetime.js`
- `game/03-JavaScript/time.js`
- `game/03-JavaScript/time-macros.js`

值得借鉴：

- 单一时间值是事实来源，日期、星期、时段和季节由它派生；
- 正常推进集中经过一个入口；
- 日、周、月等边界在固定位置处理；
- 剧情跳时与正常逐步推进分开，防止长距离推进做无意义工作。

不应照搬：

- PoC 不需要完整现实日历与分钟精度；
- 周期函数直接修改大量全局变量，结算顺序难以验证；
- 推进过程中发生错误仍可能设置最终时间，存在部分提交风险；
- 许多业务规则依赖隐式全局对象。

项目自有规范见 [`../poc/simulation-rules.md`](../poc/simulation-rules.md) 的时间模型。本研究笔记不规定实现。

## 4. 事件、条件与随机选择

关键文件：

- `game/03-JavaScript/eventpool.js`
- `game/03-JavaScript/condition.js`
- `game/03-JavaScript/event-debug.js`
- `events.twee-config.yml`

值得借鉴：

- 先筛选候选事件，再进行随机选择；
- 记录候选列表、权重、随机值和最终事件，方便诊断；
- 提供强制指定事件与搜索事件的调试入口；
- 内容作者需要参数、标签和用途说明，本质上需要 authoring schema。

不应照搬：

- 事件正文或条件以宏字符串/表达式动态执行；
- 事件直接耦合全局临时变量、jQuery 和渲染；
- 用特殊权重同时表达优先级和概率；
- 任意条件树难以静态验证。

项目自有规范见 [`../superpowers/specs/2026-07-10-react-game-harness-design.md`](../superpowers/specs/2026-07-10-react-game-harness-design.md) 的 StoryPackage、内容 IR 与确定性随机。本研究笔记不规定接口形状。

## 5. 状态与数据组织

关键文件：

- `game/04-Variables/variables-start2.twee`
- `game/04-Variables/variables-static.twee`
- `game/00-framework-tools/constants-loader.js`
- `types/*.d.ts`
- `modules/readme.md`

值得借鉴：

- 静态定义与进入存档的运行态必须分开；
- 静态常量初始化后冻结；
- 内容按区域和功能域组织；
- 日、周等周期内一次性 flag 需要清理边界；
- 稳定遍历顺序对可复现结果很重要。

不应照搬：

- 多个巨型全局对象承担所有状态；
- 自由形状的 `daily` / `weekly` 对象在边界整体清空，缺少类型与所有权；
- 数字文件名前缀承担隐式加载依赖；
- 字符串 key 与数组位置混用，位置变化会污染存档。

项目自有规范见 [`../poc/simulation-rules.md`](../poc/simulation-rules.md) 与 [`../superpowers/specs/2026-07-10-react-game-harness-design.md`](../superpowers/specs/2026-07-10-react-game-harness-design.md)。

## 6. 存档与迁移

关键文件：

- `game/03-JavaScript/save.js`
- `game/01-config/sugarcubeConfig.js`
- `game/00-framework-tools/02-version/`
- `game/00-framework-tools/03-compression/`
- `game/04-Variables/variables-versionUpdate.twee`

值得借鉴：

- 保存运行状态与 PRNG 状态；
- 区分自动、手动和导入导出；
- 存档展示 metadata 与实际状态分工；
- 加载时先恢复传输格式，再迁移纯数据；
- 连续 schema 迁移与旧 fixture 是长期维护基础；
- 旧程序不应静默加载更高版本存档；
- 压缩或转换后立即 round-trip 比较是很好的验证思路。

不应照搬：

- 在 PoC 期自制压缩、防篡改和大量槽位；
- 迁移函数混入内容宏、导航和业务结算；
- metadata 与主状态分开更新导致不同步风险；
- 新旧迁移体系长期并存。

项目自有存档合同见 [`../superpowers/specs/2026-07-10-react-game-harness-design.md`](../superpowers/specs/2026-07-10-react-game-harness-design.md) 第 15 节。

## 7. 构建与内容检查

关键文件：

- `compile.sh` / `compile.bat`
- `package.json` / `package-lock.json`
- `lint-staged.config.js`
- `.husky/pre-commit`
- `sanityCheck.sh`
- `devTools/check.py`

值得借鉴：

- 一条命令生成完整可运行版本；
- 锁文件和统一格式；
- 从 Git 注入构建标识；
- 内容格式同样需要“编译”与静态检查；
- 提交前自动运行最小质量门。

不应照搬：

- 系统编译器优先于仓库工具导致构建不完全可复现；
- Windows/Unix 脚本重复；
- 主要靠文件顺序拼装全局运行时；
- lint 默认修改文件；
- grep 式 sanity check 只能提示，不能替代类型和单测；
- 没有把 typecheck、unit test 和 CI 作为一等入口。

项目是否采用这些命令，由后续项目自有实现计划决定；本节只记录为什么需要自动化检查。

## 8. 调试与测试工具

关键文件：

- `game/00-framework-tools/01-error/error.js`
- `game/03-JavaScript/debug-menu.js`
- `game/base-debug/debug.twee`
- `game/base-debug/debug-events.twee`
- `game/base-debug/scene-viewer.twee`

值得借鉴：

- 有容量限制的错误记录；
- 报错带构建版本、位置、事件上下文和随机信息；
- 跳时间、强制事件、调整状态与固定随机结果；
- 搜索和直接打开内容；
- 独立场景查看器与存档比较。

不应照搬：

- 调试宏直接修改全局变量；
- 调试状态混入正常存档；
- 手工测试房间替代自动化规则测试。

项目自有调试和测试合同见 [`../superpowers/specs/2026-07-10-react-game-harness-design.md`](../superpowers/specs/2026-07-10-react-game-harness-design.md) 第 16、20 节。

## 9. 使用边界

一句话：这份笔记只说明一个长期内容项目最终会需要哪些能力，以及哪些历史包袱不应复制。实现顺序、接口、数值和验收只由本项目自己的 `docs/poc/`、架构文档、后续实施计划与测试决定；不得从上列参考文件反推或移植代码结构。
