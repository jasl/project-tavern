// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  createElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ComponentType, ReactElement } from "react";

import type { AssetId, DeepReadonly, HitMapDescriptorV1, TextId } from "@sillymaker/base";
import {
  Button,
  CharacterHostV1,
  DiagnosticExportButtonV1,
  GameShell,
  OverlayHostV1,
  SaveOverlayV1,
  SettingsLauncherV1,
  StageSceneHostV1,
  SystemDialogHostV1,
  usePresentationAssetV1,
  useRuntimePresentationV1,
} from "@sillymaker/ui";
import { DevDockV1, createDevDockContributionSetV1 } from "@sillymaker/ui/debug";
import type { DevDockContributionSetV1, DevDockOpenStateV1 } from "@sillymaker/ui/debug";
import type {
  OverlayRendererResolverV1,
  SaveOverlayLabelsV1,
  UiRendererNamespaceV1,
} from "@sillymaker/ui";

import { pocNoContentFilterOptionsTextIdV1, pocTextIdsV1 } from "../content/text-ids.js";
import { pocStageSceneIdsV1 } from "../presentation/presentation-ids.js";
import type {
  PocOverlayIdV1,
  PocRuntimePresentationPublicationV1,
} from "../presentation/runtime/contracts.js";
import {
  pocFixedRendererIdsV1,
  type PocInteractionRendererViewV1,
  type PocUiRendererContextsV1,
} from "../presentation/ui-contributions.js";
import type { PocSemanticActionDescriptorV1 } from "../presentation/semantic-actions.js";
import type {
  PocInteractionSurfaceResolutionV1,
  PocPresentationRuntimeV1,
} from "./create-poc-presentation-runtime.js";

export interface PocApplicationRootPropsV1 {
  readonly runtime: PocPresentationRuntimeV1;
}

const closedDevDockStateV1 = Object.freeze({
  leftOpen: false,
  rightOpen: false,
}) satisfies DevDockOpenStateV1;
const emptyDevDockContributionsV1 = createDevDockContributionSetV1({ panels: [] });

const pocDiagnosticCategoryLabelsV1 = Object.freeze({
  provenance: "构建与来源信息",
  capabilities_and_integrity: "运行能力与完整性状态",
  replay_evidence: "完整游戏状态与命令历史",
  diagnostics_and_runtime_failures: "诊断与运行时故障",
  failure_context: "失败现场",
  ui_context: "界面上下文",
});

const pocSaveOverlayLabelsV1 = Object.freeze({
  accessibleName: "保存",
  title: "保存",
  storageLoading: "正在读取本地存档…",
  storageReady: "本地存档可用",
  storageBusy: "存档操作进行中",
  storageUnavailable: "本地存储不可用",
  slotsUnavailable: "无法读取存档槽",
  safelySaved: (commandSequence: number) => `已安全保存至指令 ${commandSequence}`,
  lastFailure: (code: string) => `上次存档失败：${code}`,
  slotNames: Object.freeze({
    "auto.current": "当前自动存档",
    "auto.previous": "上一自动存档",
    quick: "快速存档",
    manual: "手动存档",
  }),
  slotHealth: Object.freeze({
    empty: "空",
    valid: "可用",
    invalid: "已损坏",
    recovery_candidate: "可恢复",
    unavailable: "不可用",
  }),
  quickSave: "快速保存",
  manualSave: "手动保存",
  importSave: "导入存档",
  exportCurrentSave: "导出当前进度",
  loadSlot: (slotName: string) => `载入${slotName}`,
  clearSlot: (slotName: string) => `清除${slotName}`,
  exportSlot: (slotName: string) => `导出${slotName}`,
  confirmation: Object.freeze({
    loadTitle: (slotName: string) => `载入${slotName}`,
    loadDescription: (slotName: string) => `当前进度将被${slotName}替换。`,
    clearTitle: (slotName: string) => `清除${slotName}`,
    clearDescription: (slotName: string) => `${slotName}将被永久清除。`,
    importTitle: "导入存档",
    importDescription: "当前进度将被所选存档替换。",
    confirmLabel: "确认",
    cancelLabel: "取消",
    pendingText: "正在处理…",
    completedText: "操作完成",
    failedText: "操作失败",
  }),
  operation: Object.freeze({
    saving: (slotName: string) => `正在保存到${slotName}…`,
    loading: (slotName: string) => `正在载入${slotName}…`,
    clearing: (slotName: string) => `正在清除${slotName}…`,
    importing: "正在导入存档…",
    exporting: (slotName: string) => `正在导出${slotName}…`,
    exportingCurrent: "正在导出当前进度…",
    saved: (slotName: string) => `已保存到${slotName}`,
    cleared: (slotName: string) => `已清除${slotName}`,
    loadedExact: "已载入存档",
    loadedAdopted: "已兼容载入存档",
    importedExact: "已导入存档",
    importedAdopted: "已兼容导入存档",
    importCancelled: "已取消导入存档",
    importFileRejected: Object.freeze({
      too_large: "所选存档文件过大",
      unsupported_type: "所选文件类型不受支持",
    }),
    exported: (slotName: string) => `已导出${slotName}`,
    exportedCurrent: "已导出当前进度",
    rejected: Object.freeze({
      busy: "会话正忙",
      unavailable: "存储不可用",
      empty_slot: "存档槽为空",
      conflict: "存档发生冲突",
      invalid_record: "存档无效",
      lineage_limit: "存档兼容链过长",
      incompatible: "存档不兼容",
    }),
    exportRejected: Object.freeze({
      unavailable: "存储不可用",
      empty_slot: "存档槽为空",
      conflict: "存档发生冲突",
      invalid_record: "存档无效",
    }),
    faulted: (code: string) => `存档故障：${code}`,
    unexpectedFailure: "存档操作意外失败",
  }),
}) satisfies SaveOverlayLabelsV1;

function requireRendererV1<TNamespace extends UiRendererNamespaceV1>(
  runtime: PocPresentationRuntimeV1,
  namespace: TNamespace,
  rendererId: string,
): ComponentType<PocUiRendererContextsV1[TNamespace]> {
  const resolution = runtime.contributions.resolve(namespace, rendererId);
  if (resolution.kind !== "found") {
    throw new TypeError(`ui.poc.renderer_not_found:${namespace}:${rendererId}`);
  }
  return resolution.component;
}

function overlayTitleTextIdV1(overlayId: Exclude<PocOverlayIdV1, "overlay.poc.save">): TextId {
  switch (overlayId) {
    case "overlay.poc.policy":
      return pocTextIdsV1.overlayPolicyTitle;
    case "overlay.poc.inventory":
      return pocTextIdsV1.overlayInventoryTitle;
    case "overlay.poc.purchase":
      return pocTextIdsV1.overlayPurchaseTitle;
    case "overlay.poc.tavern_plan":
      return pocTextIdsV1.overlayTavernPlanTitle;
    case "overlay.poc.facility":
      return pocTextIdsV1.overlayFacilityTitle;
    case "overlay.poc.world_action":
      return pocTextIdsV1.overlayWorldActionTitle;
    case "overlay.poc.ledger":
      return pocTextIdsV1.overlayLedgerTitle;
    case "overlay.poc.relationship":
      return pocTextIdsV1.overlayRelationshipTitle;
    case "overlay.poc.run_summary":
      return pocTextIdsV1.overlayRunSummaryTitle;
  }
  const unsupportedOverlayId: never = overlayId;
  throw new TypeError(`ui.poc.overlay_unknown:${unsupportedOverlayId}`);
}

type PocPurchaseDescriptorV1 = Extract<
  PocSemanticActionDescriptorV1,
  { readonly actionId: "action.purchase" }
>;
type PocRunStartDescriptorV1 = Extract<
  PocSemanticActionDescriptorV1,
  { readonly actionId: "action.run_start" }
>;
type PocLifePolicyDescriptorV1 = Extract<
  PocSemanticActionDescriptorV1,
  { readonly actionId: "action.choose_life_policy" }
>;
type PocChoicesDescriptorV1 = Extract<
  PocSemanticActionDescriptorV1,
  { readonly delivery: "choices" }
>;

function pocChoiceOverlayIdV1(
  descriptor: DeepReadonly<PocChoicesDescriptorV1>,
): PocOverlayIdV1 | null {
  switch (descriptor.actionId) {
    case "action.choose_life_policy":
      return "overlay.poc.policy";
    case "action.facility_window":
      return "overlay.poc.facility";
    case "action.old_trade_road":
      return "overlay.poc.world_action";
    case "action.narrative_choose":
      return null;
  }
  const unsupportedDescriptor: never = descriptor;
  throw new TypeError(`PoC choice action is unsupported: ${String(unsupportedDescriptor)}`);
}

function PocCanonicalSemanticControlsV1(props: {
  readonly runtime: PocPresentationRuntimeV1;
  readonly publication: DeepReadonly<PocRuntimePresentationPublicationV1>;
}): ReactElement {
  const semantic = props.runtime.application.semantic;
  const presentation = props.runtime.presentationRead;

  return (
    <div role="group" aria-label="语义操作" data-semantic-action-catalog="true">
      {props.publication.semantic.actions.flatMap((descriptor) => {
        const disabledReasons = descriptor.reasons.map((reason) => reason.code).join(",");
        const label = presentation.text(descriptor.textId).text;
        const commonProps = Object.freeze({
          disabled: !descriptor.enabled,
          "data-semantic-action-id": descriptor.actionId,
          "data-semantic-disabled-reasons": disabledReasons,
        });
        if (descriptor.delivery === "direct") {
          return [
            <Button
              key={descriptor.actionId}
              {...commonProps}
              aria-label={`语义目录：${label}`}
              onClick={() => void semantic.dispatch(descriptor.directInvocation)}
            >
              {label}
            </Button>,
          ];
        }
        if (descriptor.delivery === "form") {
          const overlayId =
            descriptor.form.kind === "purchase"
              ? ("overlay.poc.purchase" as const)
              : ("overlay.poc.tavern_plan" as const);
          return [
            <Button
              key={descriptor.actionId}
              {...commonProps}
              aria-label={`语义目录：${label}`}
              onClick={() =>
                props.runtime.intents.execute(
                  Object.freeze({ kind: "overlay.open" as const, overlayId }),
                )
              }
            >
              {label}
            </Button>,
          ];
        }
        const overlayId = pocChoiceOverlayIdV1(descriptor);
        if (overlayId !== null) {
          return [
            <Button
              key={descriptor.actionId}
              {...commonProps}
              aria-label={`语义目录：${label}`}
              onClick={() =>
                props.runtime.intents.execute(
                  Object.freeze({ kind: "overlay.open" as const, overlayId }),
                )
              }
            >
              {label}
            </Button>,
          ];
        }
        return descriptor.options.map((option) => {
          const optionLabel = presentation.text(option.textId).text;
          return (
            <Button
              key={`${descriptor.actionId}:${option.optionId}`}
              {...commonProps}
              aria-label={`语义目录：${optionLabel}`}
              onClick={() => void semantic.dispatch(option.invocation)}
            >
              {optionLabel}
            </Button>
          );
        });
      })}
    </div>
  );
}

function uniqueEnabledPurchaseDescriptorV1(
  actions: readonly DeepReadonly<PocSemanticActionDescriptorV1>[],
): DeepReadonly<PocPurchaseDescriptorV1> | null {
  const matches = actions.filter(
    (candidate): candidate is DeepReadonly<PocPurchaseDescriptorV1> =>
      candidate.actionId === "action.purchase" &&
      candidate.delivery === "form" &&
      candidate.form.kind === "purchase" &&
      candidate.enabled,
  );
  return matches.length === 1 ? (matches[0] ?? null) : null;
}

function uniqueEnabledRunStartDescriptorV1(
  actions: readonly DeepReadonly<PocSemanticActionDescriptorV1>[],
): DeepReadonly<PocRunStartDescriptorV1> | null {
  const matches = actions.filter(
    (candidate): candidate is DeepReadonly<PocRunStartDescriptorV1> =>
      candidate.actionId === "action.run_start" &&
      candidate.delivery === "direct" &&
      candidate.directInvocation.actionId === "action.run_start" &&
      candidate.enabled,
  );
  return matches.length === 1 ? (matches[0] ?? null) : null;
}

function uniqueEnabledLifePolicyDescriptorV1(
  actions: readonly DeepReadonly<PocSemanticActionDescriptorV1>[],
): DeepReadonly<PocLifePolicyDescriptorV1> | null {
  const matches = actions.filter(
    (candidate): candidate is DeepReadonly<PocLifePolicyDescriptorV1> =>
      candidate.actionId === "action.choose_life_policy" &&
      candidate.delivery === "choices" &&
      candidate.options.length > 0 &&
      candidate.enabled,
  );
  return matches.length === 1 ? (matches[0] ?? null) : null;
}

function findHitMapV1(
  runtime: PocPresentationRuntimeV1,
  hitMapId: PocInteractionRendererViewV1["surface"]["hitMapId"],
): DeepReadonly<HitMapDescriptorV1> | null {
  if (hitMapId === null) return null;
  const matches = runtime.resolvedGame.sceneGraph.hitMaps.filter(
    (candidate) => candidate.hitMapId === hitMapId,
  );
  return matches.length === 1 ? (matches[0] ?? null) : null;
}

function PocResolvedInteractionRendererV1(props: {
  readonly runtime: PocPresentationRuntimeV1;
  readonly resolution: PocInteractionSurfaceResolutionV1;
  readonly hitMap: DeepReadonly<HitMapDescriptorV1> | null;
}): ReactElement {
  const InteractionRenderer = requireRendererV1(
    props.runtime,
    "scene_interaction",
    pocFixedRendererIdsV1.sceneInteraction,
  );
  return createElement(InteractionRenderer, {
    viewSlice: Object.freeze({
      surface: props.resolution.surface,
      hitMap: props.hitMap,
      spatialState: props.hitMap === null ? ("disabled" as const) : props.resolution.spatialState,
    }) satisfies DeepReadonly<PocInteractionRendererViewV1>,
    semantic: props.runtime.application.semantic,
    presentation: props.runtime.presentationRead,
    controller: props.runtime.rendering.interactionController,
    session: props.runtime.rendering.interactionSession,
    inputRouter: props.runtime.input,
  });
}

function PocAssetGatedInteractionRendererV1(props: {
  readonly runtime: PocPresentationRuntimeV1;
  readonly resolution: PocInteractionSurfaceResolutionV1;
  readonly hitMap: DeepReadonly<HitMapDescriptorV1>;
  readonly criticalLayerAssetId: AssetId;
  readonly staticFallbackAssetId: AssetId;
  readonly fallbackHitMapCompatibility: "compatible" | "incompatible";
}): ReactElement {
  const criticalLayer = usePresentationAssetV1(
    props.runtime.presentationRead,
    props.criticalLayerAssetId,
    "character_pose",
  );
  const staticFallback = usePresentationAssetV1(
    props.runtime.presentationRead,
    props.staticFallbackAssetId,
    "character_pose",
  );
  const compatibleVisual =
    criticalLayer.delivery === "runtime_image" ||
    (props.fallbackHitMapCompatibility === "compatible" &&
      staticFallback.delivery === "runtime_image");
  return (
    <PocResolvedInteractionRendererV1
      runtime={props.runtime}
      resolution={props.resolution}
      hitMap={compatibleVisual ? props.hitMap : null}
    />
  );
}

function PocInteractionLayerV1(props: {
  readonly runtime: PocPresentationRuntimeV1;
  readonly publication: DeepReadonly<PocRuntimePresentationPublicationV1>;
}): ReactElement | null {
  const nodes = props.publication.view.interactionSurfaces.map((surface) => {
    const resolution = props.runtime.rendering.resolveInteractionSurface(
      props.publication,
      surface.surfaceId,
    );
    if (resolution === null) return null;
    const hitMapId = resolution.surface.hitMapId;
    const hitMap = findHitMapV1(props.runtime, hitMapId);
    if (hitMapId === null || hitMap === null) {
      return (
        <PocResolvedInteractionRendererV1
          key={surface.surfaceId}
          runtime={props.runtime}
          resolution={resolution}
          hitMap={null}
        />
      );
    }
    const characters = props.publication.view.characters.filter(
      (character) => character.hitMapId === hitMapId,
    );
    const character = characters.length === 1 ? characters[0] : undefined;
    const criticalLayers = character?.appearance.filter(
      (layer) => layer.fallbackPolicy === "character_fallback",
    );
    const criticalLayer = criticalLayers?.length === 1 ? criticalLayers[0] : undefined;
    if (
      character === undefined ||
      criticalLayer === undefined ||
      character.staticFallbackAssetId === null
    ) {
      return (
        <PocResolvedInteractionRendererV1
          key={surface.surfaceId}
          runtime={props.runtime}
          resolution={resolution}
          hitMap={null}
        />
      );
    }
    return (
      <PocAssetGatedInteractionRendererV1
        key={surface.surfaceId}
        runtime={props.runtime}
        resolution={resolution}
        hitMap={hitMap}
        criticalLayerAssetId={criticalLayer.assetId}
        staticFallbackAssetId={character.staticFallbackAssetId}
        fallbackHitMapCompatibility={character.fallbackHitMapCompatibility}
      />
    );
  });
  return nodes.every((node) => node === null) ? null : <>{nodes}</>;
}

function createOverlayResolverV1(input: {
  readonly renderer: ComponentType<PocUiRendererContextsV1["workspace_overlay"]>;
  readonly publication: DeepReadonly<PocRuntimePresentationPublicationV1>;
  readonly runtime: PocPresentationRuntimeV1;
}): OverlayRendererResolverV1<PocOverlayIdV1> {
  const presentation = input.runtime.presentationRead;
  const semantic = input.runtime.application.semantic;
  return Object.freeze({
    resolve(overlayId: DeepReadonly<PocOverlayIdV1>) {
      if (overlayId === "overlay.poc.save") {
        return Object.freeze({
          accessibleName: pocSaveOverlayLabelsV1.accessibleName,
          content: (
            <SaveOverlayV1
              port={input.runtime.playerUi.save}
              labels={pocSaveOverlayLabelsV1}
              inputRouter={input.runtime.input}
            />
          ),
        });
      }
      return Object.freeze({
        accessibleName: presentation.text(overlayTitleTextIdV1(overlayId)).text,
        content: createElement(input.renderer, {
          viewSlice: Object.freeze({
            overlayId,
            game: input.publication.view.game,
            actions: input.publication.semantic.actions,
          }),
          semantic,
          presentation,
          gameSymbols: input.runtime.gameSymbols,
        }),
      });
    },
  });
}

export function PocApplicationRootV1({ runtime }: PocApplicationRootPropsV1): ReactElement {
  const effectiveCapabilities = useSyncExternalStore(
    runtime.capabilitySession.state.subscribe,
    runtime.capabilitySession.state.getCurrent,
    runtime.capabilitySession.state.getCurrent,
  );
  const [loadedDevDockContributions, setLoadedDevDockContributions] = useState<{
    readonly owner: PocPresentationRuntimeV1 | null;
    readonly contributions: DevDockContributionSetV1;
  }>(() => Object.freeze({ owner: null, contributions: emptyDevDockContributionsV1 }));
  useEffect(() => {
    let active = true;
    if (!effectiveCapabilities.debugTools) {
      return () => {
        active = false;
      };
    }
    void runtime
      .loadToolingUiContributions()
      .then((contributions) => {
        if (!active || !runtime.capabilitySession.state.getCurrent().debugTools) return;
        setLoadedDevDockContributions(Object.freeze({ owner: runtime, contributions }));
      })
      .catch(() => {
        if (!active) return;
        setLoadedDevDockContributions(
          Object.freeze({ owner: null, contributions: emptyDevDockContributionsV1 }),
        );
      });
    return () => {
      active = false;
    };
  }, [effectiveCapabilities.debugTools, runtime]);
  const devDockContributions =
    effectiveCapabilities.debugTools && loadedDevDockContributions.owner === runtime
      ? loadedDevDockContributions.contributions
      : emptyDevDockContributionsV1;
  const [devDockOpenState, setDevDockOpenState] =
    useState<DevDockOpenStateV1>(closedDevDockStateV1);
  const devDockOpenStateRef = useRef<DevDockOpenStateV1>(closedDevDockStateV1);
  const updateDevDockOpenState = useCallback((next: DevDockOpenStateV1): void => {
    const current = devDockOpenStateRef.current;
    if (current.leftOpen === next.leftOpen && current.rightOpen === next.rightOpen) return;
    const frozen = Object.freeze({
      leftOpen: next.leftOpen,
      rightOpen: next.rightOpen,
    }) satisfies DevDockOpenStateV1;
    devDockOpenStateRef.current = frozen;
    setDevDockOpenState(frozen);
  }, []);
  useLayoutEffect(
    () => runtime.bindDevDockStateReader(() => devDockOpenStateRef.current),
    [runtime],
  );
  const publication = useRuntimePresentationV1(runtime.presentation);
  const semantic = runtime.application.semantic;
  const presentation = runtime.presentationRead;
  const HudRenderer = requireRendererV1(runtime, "hud", pocFixedRendererIdsV1.hud);
  const OverlayRenderer = requireRendererV1(
    runtime,
    "workspace_overlay",
    pocFixedRendererIdsV1.workspaceOverlay,
  );
  const NarrativeRenderer = requireRendererV1(
    runtime,
    "narrative",
    pocFixedRendererIdsV1.narrative,
  );
  const SystemRenderer = requireRendererV1(runtime, "system", pocFixedRendererIdsV1.system);

  const overlayResolver = createOverlayResolverV1({
    renderer: OverlayRenderer,
    publication,
    runtime,
  });
  const purchaseDescriptor = uniqueEnabledPurchaseDescriptorV1(publication.semantic.actions);
  const runStartDescriptor = uniqueEnabledRunStartDescriptorV1(publication.semantic.actions);
  const lifePolicyDescriptor = uniqueEnabledLifePolicyDescriptorV1(publication.semantic.actions);

  const layers = Object.freeze({
    background: (
      <StageSceneHostV1
        stage={publication.view.stage}
        contributions={runtime.contributions}
        semantic={semantic}
        presentation={presentation}
      />
    ),
    character: publication.view.characters.map((character) => (
      <CharacterHostV1
        key={character.characterId}
        character={character}
        contributions={runtime.contributions}
        semantic={semantic}
        presentation={presentation}
      />
    )),
    sceneInteraction: <PocInteractionLayerV1 runtime={runtime} publication={publication} />,
    hud: (
      <>
        <PocCanonicalSemanticControlsV1 runtime={runtime} publication={publication} />
        {createElement(HudRenderer, {
          viewSlice: publication.view.game.hud,
          semantic,
          presentation,
          gameSymbols: runtime.gameSymbols,
        })}
      </>
    ),
    workspaceOverlay: (
      <OverlayHostV1
        store={runtime.rendering.overlaySession}
        rendererResolver={overlayResolver}
        inputRouter={runtime.input}
        closeLabel={presentation.text(pocTextIdsV1.controlCloseLabel).text}
      />
    ),
    narrative: createElement(NarrativeRenderer, {
      viewSlice: Object.freeze({
        narrative: publication.view.narrative,
        actions: publication.semantic.actions,
      }),
      semantic,
      presentation,
    }),
    system: (
      <SystemDialogHostV1
        inputRouter={runtime.input}
        store={runtime.rendering.systemDialogSession}
        settings={Object.freeze({
          title: "设置",
          closeLabel: presentation.text(pocTextIdsV1.controlCloseLabel).text,
          sections: Object.freeze([]),
          emptyText: presentation.text(pocNoContentFilterOptionsTextIdV1).text,
        })}
      >
        {createElement(SystemRenderer, {
          viewSlice: null,
          semantic,
          presentation,
        })}
        <output
          data-testid="semantic-publication"
          data-semantic-publication="true"
          data-semantic-revision={publication.semantic.revision}
          data-semantic-status={publication.semantic.status}
        >
          语义状态 {publication.semantic.status}，修订 {publication.semantic.revision}
        </output>
        {runStartDescriptor === null ? null : (
          <Button onClick={() => void semantic.dispatch(runStartDescriptor.directInvocation)}>
            {presentation.text(runStartDescriptor.textId).text}
          </Button>
        )}
        {lifePolicyDescriptor === null ? null : (
          <Button
            onClick={() =>
              runtime.intents.execute(
                Object.freeze({
                  kind: "overlay.open" as const,
                  overlayId: "overlay.poc.policy" as const,
                }),
              )
            }
          >
            {presentation.text(lifePolicyDescriptor.textId).text}
          </Button>
        )}
        {purchaseDescriptor === null ? null : (
          <Button
            onClick={() =>
              runtime.intents.execute(
                Object.freeze({
                  kind: "overlay.open" as const,
                  overlayId: "overlay.poc.purchase" as const,
                }),
              )
            }
          >
            {presentation.text(purchaseDescriptor.textId).text}
          </Button>
        )}
        <Button
          onClick={() =>
            runtime.intents.execute(
              Object.freeze({
                kind: "overlay.open" as const,
                overlayId: "overlay.poc.save" as const,
              }),
            )
          }
        >
          保存
        </Button>
        <SettingsLauncherV1 label="设置" />
        <DiagnosticExportButtonV1
          diagnostics={runtime.playerUi.diagnostics}
          sessionStatus={publication.semantic.status}
          label="导出调试包"
          preparingText="正在准备调试包…"
          reviewTitle="检查调试包内容"
          filenameLabel="文件名"
          digestLabel="SHA-256"
          encodedByteLengthLabel="编码后大小"
          categoriesLabel="包含内容"
          categoryLabels={pocDiagnosticCategoryLabelsV1}
          saveLabel="保存调试包"
          cancelLabel="取消"
          savingText="正在保存调试包…"
          completedText="调试包已保存"
          failedText="调试包操作失败"
        />
      </SystemDialogHostV1>
    ),
  });

  return (
    <div
      role="application"
      aria-label="Project Tavern 七日原型"
      data-application-id={runtime.applicationId}
      data-semantic-revision={publication.semantic.revision}
    >
      {publication.view.stage.stageSceneId === pocStageSceneIdsV1[0] ? (
        <nav aria-label="Project Tavern 主菜单">
          <a href="#/play">开始七日原型</a>
        </nav>
      ) : null}
      <GameShell
        accessibleName={
          presentation.text(publication.view.stage.background.accessibleNameTextId).text
        }
        layers={layers}
        inputRouter={runtime.input}
        devDock={
          <DevDockV1
            capabilities={runtime.application.capabilities}
            contributions={devDockContributions}
            inputRouter={runtime.input}
            openState={devDockOpenState}
            onOpenStateChange={updateDevDockOpenState}
          />
        }
      />
    </div>
  );
}
