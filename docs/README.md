# 文档地图

本目录把长期方向、当前 PoC 合同、可调数值和工程边界分开，避免原型临时决定反向污染正式游戏设计。

## 长期方向

- [`design/game-design-baseline.md`](design/game-design-baseline.md)：已经确认的产品愿景、系统边界与叙事方向。

## 当前七日 PoC

- [`superpowers/specs/2026-07-10-react-game-harness-design.md`](superpowers/specs/2026-07-10-react-game-harness-design.md)：当前技术架构权威；定义生产级 Web Harness、StoryPackage、中央舞台 UI、存档/调试、测试、构建与素材边界。
- [`art/first-web-visual-pack.md`](art/first-web-visual-pack.md)：首批 Image Gen 视觉语言、场景/人物锚点、Asset ID、安全区、来源记录与验收。
- [`poc/poc-charter.md`](poc/poc-charter.md)：为什么做、做多少、怎样判断通过。
- [`poc/simulation-rules.md`](poc/simulation-rules.md)：状态模型、命令、时间推进、事件与结算顺序。
- [`poc/balance-v0.md`](poc/balance-v0.md)：首轮可执行数值，不代表正式平衡。
- [`poc/content-and-playtest.md`](poc/content-and-playtest.md)：固定七日场景、教学节奏与策略测试矩阵。
- [`poc/reference-strategies.md`](poc/reference-strategies.md)：把六种 reference 策略展开为唯一命令序列的确定性 driver。

权威按领域划分并写在仓库根目录 `AGENTS.md`：新 Harness 规格负责技术边界，`docs/poc/` 负责七日玩法与数值。

## 研究

- [`research/degrees-of-lewdity-notes.md`](research/degrees-of-lewdity-notes.md)：对本地参考项目的独立重实现工程观察及许可证边界。
- [`research/reference-register.md`](research/reference-register.md)：所有本地参考资料的来源、版本、许可提示和允许用途。

## 决策状态

- **已形成基线、待最终确认**：首个可玩物是七日网页 Story；Harness 代码按生产级维护；模拟核心与 UI 分离；无后端；固定种子；IndexedDB 本地存档；Story 可实现受控强类型规则接口；首批 Web 视觉包使用原创 Image Gen 素材。
- **本轮可调**：所有经济数值、行动/体力强度、需求与委托效率。
- **等待试玩**：行动点与体力是否重复、经营步骤是否疲劳、预测信息量、三种营业模式是否都有用途。
- **明确延后**：Unity、大规模正式美术、完整关系阶段、完整设施树、多周目、Mod、运行时 LLM、成人版本。
