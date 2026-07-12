# Project Tavern Final Human Review Plan

状态：独立后置轨道；不属于 Phase 2–6 工程 Goal

## 进入条件

- 本地工程 Goal 已完成，所有自动化质量、完整流程、浏览器、可访问性、可复现 Artifact 和文档 gate 均通过；
- review build 绑定一个 clean source SHA、`dist/poc` manifest digest 和 Debug/Automation capability 默认值；
- 素材轨道已经明确哪些运行时素材获准使用；未批准槽位继续显示 fallback；
- 审查期间不修改该 Artifact。发现的问题记录为新任务后另行修复和重验。

## 审查范围

1. 从新局完整游玩七日流程，并至少体验两种取舍明显不同的 reference strategy；
2. 检查每回合操作疲劳、信息焦点、忘记操作的惩罚、回档压力和重复内容；
3. 检查酒馆经营、关系互动、文字冒险和网状剧情是否互相支撑；
4. 检查女主在冷淡、友好、信任、爱慕等状态下的表现差异是否清晰且不过度打扰主轴；
5. 在横屏平板和触摸环境完成核心流程；
6. 在 Safari/VoiceOver 检查 landmarks、动作列表、disabled reason、Overlay/VN/DevDock 焦点与重复播报；
7. 检查已批准背景、人物层和 UI 在 16:10、4:3 安全区、竖屏与 200% zoom 下的一致性；
8. 记录喜欢、不理解、疲劳、失焦、想继续和想放弃的具体时刻。

## 结果

结果固定为 `passed | passed_with_followups | failed`，并记录 reviewer、设备/OS/浏览器、source SHA、Artifact digest、日期、问题链接和主观结论。它可以决定下一轮玩法/内容方向，但不能改写已经通过的工程证据。

人工审查不包含远端部署；需要在线分发时另行启动 deferred distribution 任务。
