// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { parseLocaleId, parseTextCatalogSetV1, parseTextId } from "@sillymaker/base";

export const e2eDefaultLocaleV1 = parseLocaleId("zh-CN");
export const e2eContentPreferenceRejectedTextIdV1 = parseTextId(
  "text.e2e.settings.content_filter.rejected",
);
export const e2eContentPreferenceStorageFailedTextIdV1 = parseTextId(
  "text.e2e.settings.content_filter.storage_failed",
);

export const e2eTextCatalogsV1 = parseTextCatalogSetV1({
  defaultLocale: e2eDefaultLocaleV1,
  catalogs: [
    {
      locale: e2eDefaultLocaleV1,
      fallbackLocale: null,
      entries: [
        { textId: "text.e2e.counter", text: "计数" },
        { textId: "text.e2e.increment", text: "增加计数" },
        { textId: "text.e2e.stage.main.name", text: "E2E 游戏舞台" },
        { textId: "text.e2e.stage.summary.name", text: "E2E 流程总结" },
        { textId: "text.e2e.character.counter.name", text: "测试计数器" },
        { textId: "text.e2e.surface.counter.name", text: "测试计数器互动" },
        { textId: "text.e2e.target.counter.name", text: "测试计数器" },
        {
          textId: "text.e2e.behavior.counter.increment.description",
          text: "将测试计数增加一",
        },
        { textId: "text.e2e.content_flag.alpha.name", text: "Alpha 标记" },
        {
          textId: "text.e2e.content_flag.alpha.description",
          text: "用于中性内容过滤机制测试的 Alpha 标记",
        },
        { textId: "text.e2e.content_flag.beta.name", text: "Beta 标记" },
        {
          textId: "text.e2e.content_flag.beta.description",
          text: "用于中性内容过滤机制测试的 Beta 标记",
        },
        { textId: "text.e2e.content_preset.base.name", text: "基础" },
        {
          textId: "text.e2e.content_preset.base.description",
          text: "不启用任何中性测试标记",
        },
        { textId: "text.e2e.content_preset.stream_safe.name", text: "流式安全" },
        {
          textId: "text.e2e.content_preset.stream_safe.description",
          text: "仅启用 Beta 中性测试标记",
        },
        { textId: "text.e2e.content_preset.all.name", text: "全部" },
        {
          textId: "text.e2e.content_preset.all.description",
          text: "启用全部中性测试标记",
        },
        {
          textId: e2eContentPreferenceRejectedTextIdV1,
          text: "无法应用所选内容偏好。",
        },
        {
          textId: e2eContentPreferenceStorageFailedTextIdV1,
          text: "内容偏好保存失败。",
        },
        { textId: "text.e2e.action.start", text: "开始流程" },
        { textId: "text.e2e.action.choose", text: "选择分支" },
        { textId: "text.e2e.action.choose.left", text: "选择左侧" },
        { textId: "text.e2e.action.choose.right", text: "选择右侧" },
        { textId: "text.e2e.action.continue", text: "继续" },
        { textId: "text.e2e.action.complete", text: "完成流程" },
        { textId: "text.e2e.reason.flow_unavailable", text: "当前流程不可用" },
        { textId: "text.e2e.flow.node.intro", text: "介绍" },
        { textId: "text.e2e.flow.node.choice", text: "选择" },
        { textId: "text.e2e.flow.node.left", text: "左侧分支" },
        { textId: "text.e2e.flow.node.right", text: "右侧分支" },
        { textId: "text.e2e.flow.node.rejoin", text: "汇合" },
        { textId: "text.e2e.flow.node.done", text: "完成" },
      ],
    },
  ],
});
