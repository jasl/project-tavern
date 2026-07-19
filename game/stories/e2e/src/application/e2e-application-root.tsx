// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { parseTextId } from "@sillymaker/base";
import type { DeepReadonly, RuntimeSessionStatusV1 } from "@sillymaker/base";
import {
  Button,
  CharacterHostV1,
  DiagnosticExportButtonV1,
  GameShell,
  OverlayHostV1,
  RuntimeFailureDialogV1,
  SaveOverlayV1,
  SettingsLauncherV1,
  StageSceneHostV1,
  SystemDialogHostV1,
  useRuntimePresentationV1,
  validateRuntimeInteractionSurfaceV1,
  type GameStageLayersV1,
  type OverlayRendererResolverV1,
  type SaveOverlayLabelsV1,
  type UiContributionRegistryV1,
} from "@sillymaker/ui";
import { DevDockV1, createDevDockContributionSetV1 } from "@sillymaker/ui/debug";
import type { DevDockContributionSetV1, DevDockOpenStateV1 } from "@sillymaker/ui/debug";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ComponentType, ReactElement } from "react";

import type { E2ePresentationRuntimeV1 } from "./create-e2e-presentation-runtime.js";
import { E2eSettingsSectionV1 } from "../presentation/e2e-settings-section.js";
import type { E2eRuntimePresentationPublicationV1 } from "../presentation/runtime-presentation.js";
import { e2eApplicationTextIdsV1 } from "../presentation/text-catalogs.js";
import {
  e2eUiRendererIdsV1,
  type E2eInteractionRendererContextV1,
  type E2eUiRendererContextsV1,
} from "../presentation/ui-contributions.js";
import type {
  E2eSemanticActionDescriptorV1,
  E2eSemanticInvocationV1,
} from "../runtime/e2e-semantic-game-port.js";

export interface E2eApplicationRootPropsV1 {
  readonly runtime: E2ePresentationRuntimeV1;
}

const closedDevDockStateV1 = Object.freeze({
  leftOpen: false,
  rightOpen: false,
}) satisfies DevDockOpenStateV1;
const emptyDevDockContributionsV1 = createDevDockContributionSetV1({ panels: [] });

const e2eDiagnosticCategoryLabelsV1 = Object.freeze({
  provenance: "构建与来源信息",
  capabilities_and_integrity: "运行能力与完整性状态",
  replay_evidence: "完整游戏状态与命令历史",
  diagnostics_and_runtime_failures: "诊断与运行时故障",
  failure_context: "失败现场",
  ui_context: "界面上下文",
});

const e2eInteractionEntryIdV1 = "e2e-interaction-entry";

function e2eCanonicalOptionLabelV1(
  runtime: E2ePresentationRuntimeV1,
  descriptor: DeepReadonly<E2eSemanticActionDescriptorV1>,
  invocation: DeepReadonly<E2eSemanticInvocationV1>,
): string {
  if (descriptor.actionId === "action.e2e.choose") {
    if (invocation.actionId !== descriptor.actionId) {
      throw new TypeError(`E2E Semantic option does not match ${descriptor.actionId}`);
    }
    return runtime.presentationRead.text(
      parseTextId(`${descriptor.textId}.${invocation.parameters.choice}`),
    ).text;
  }
  if (descriptor.options.length !== 1 || invocation.actionId !== descriptor.actionId) {
    throw new TypeError(`E2E Semantic option does not match ${descriptor.actionId}`);
  }
  return runtime.presentationRead.text(descriptor.textId).text;
}

function E2eCanonicalSemanticControlsV1(props: {
  readonly runtime: E2ePresentationRuntimeV1;
  readonly publication: E2eRuntimePresentationPublicationV1;
}): ReactElement {
  return (
    <div role="group" aria-label="语义操作" data-semantic-action-catalog="true">
      {props.publication.semantic.actions.flatMap((descriptor) =>
        descriptor.options.map((invocation, optionIndex) => {
          const label = e2eCanonicalOptionLabelV1(props.runtime, descriptor, invocation);
          return (
            <Button
              key={`${descriptor.actionId}:${optionIndex}`}
              aria-label={`语义目录：${label}`}
              disabled={!descriptor.enabled}
              data-semantic-action-id={descriptor.actionId}
              data-semantic-disabled-reasons={descriptor.reasons
                .map((reason) => reason.code)
                .join(",")}
              onClick={() => void props.runtime.application.semantic.dispatch(invocation)}
            >
              {label}
            </Button>
          );
        }),
      )}
    </div>
  );
}

const e2eSaveOverlayLabelsV1 = Object.freeze({
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

function requireRendererV1<TNamespace extends keyof E2eUiRendererContextsV1>(
  registry: UiContributionRegistryV1<E2eUiRendererContextsV1>,
  namespace: TNamespace,
  rendererId: string,
): ComponentType<E2eUiRendererContextsV1[TNamespace]> {
  const resolved = registry.resolve(namespace, rendererId);
  if (resolved.kind === "not_found") {
    throw new TypeError(`ui.renderer_not_found:${namespace}:${rendererId}`);
  }
  return resolved.component;
}

function createInteractionLayerV1(
  runtime: E2ePresentationRuntimeV1,
  publication: E2eRuntimePresentationPublicationV1,
): ReactElement | null {
  const surface = publication.view.interactionSurfaces[0];
  if (surface === undefined) return null;
  const hitMap = runtime.resolvedGame.sceneGraph.hitMaps.find(
    (candidate) => candidate.hitMapId === surface.hitMapId,
  );
  if (hitMap === undefined) return null;
  const validated = validateRuntimeInteractionSurfaceV1(surface, {
    revision: publication.revision,
    resolvedSurfaces: runtime.resolvedGame.sceneGraph.interactionSurfaces,
    runtimeSurfaces: publication.view.interactionSurfaces,
  });
  const InteractionRenderer = requireRendererV1(
    runtime.contributions,
    "scene_interaction",
    e2eUiRendererIdsV1.interaction,
  );
  const context = Object.freeze({
    viewSlice: Object.freeze({
      surface: validated.surface,
      hitMap,
      spatialState: validated.spatialState,
      activeCueId: publication.view.activeCueId,
    }),
    semantic: runtime.application.semantic,
    presentation: runtime.presentationRead,
    controller: runtime.interactionController,
    session: runtime.interactionSession,
    inputRouter: runtime.input,
  }) satisfies E2eInteractionRendererContextV1;
  return <InteractionRenderer {...context} />;
}

function createCharacterLayerV1(
  runtime: E2ePresentationRuntimeV1,
  publication: E2eRuntimePresentationPublicationV1,
): ReactElement | null {
  if (publication.view.characters.length === 0) return null;
  return (
    <>
      {publication.view.characters.map((character) => (
        <CharacterHostV1
          key={character.characterId}
          character={character}
          contributions={runtime.contributions}
          semantic={runtime.application.semantic}
          presentation={runtime.presentationRead}
        />
      ))}
    </>
  );
}

function createOverlayResolverV1(
  runtime: E2ePresentationRuntimeV1,
  publication: E2eRuntimePresentationPublicationV1,
): OverlayRendererResolverV1<string> {
  const OverlayRenderer = requireRendererV1(
    runtime.contributions,
    "workspace_overlay",
    e2eUiRendererIdsV1.overlay,
  );
  const overlayContext = Object.freeze({
    viewSlice: publication.view,
    semantic: runtime.application.semantic,
    presentation: runtime.presentationRead,
  }) satisfies E2eUiRendererContextsV1["workspace_overlay"];
  return Object.freeze({
    resolve(overlayId: string) {
      if (overlayId === "overlay.e2e.test_panel") {
        return Object.freeze({
          accessibleName: "测试面板",
          content: <OverlayRenderer {...overlayContext} />,
        });
      }
      if (overlayId === "overlay.e2e.save") {
        return Object.freeze({
          accessibleName: "保存",
          content: (
            <SaveOverlayV1
              port={runtime.playerUi.save}
              labels={e2eSaveOverlayLabelsV1}
              inputRouter={runtime.input}
            />
          ),
        });
      }
      return null;
    },
  });
}

function createInteractionEntryV1(
  runtime: E2ePresentationRuntimeV1,
  publication: E2eRuntimePresentationPublicationV1,
): ReactElement | null {
  const surface = publication.view.interactionSurfaces[0];
  if (surface === undefined) return null;
  return (
    <Button
      id={e2eInteractionEntryIdV1}
      onClick={() =>
        runtime.intents.execute(
          Object.freeze({
            kind: "interaction.enter_surface" as const,
            surfaceId: surface.surfaceId,
          }),
          Object.freeze({ returnFocusId: e2eInteractionEntryIdV1 }),
        )
      }
    >
      {runtime.presentationRead.text(e2eApplicationTextIdsV1.interactionEntry).text}
    </Button>
  );
}

function createSystemLayerV1(
  runtime: E2ePresentationRuntimeV1,
  publication: E2eRuntimePresentationPublicationV1,
  stableSessionStatus: Exclude<RuntimeSessionStatusV1, "busy">,
): ReactElement {
  const applicationTextV1 = (
    textId: (typeof e2eApplicationTextIdsV1)[keyof typeof e2eApplicationTextIdsV1],
  ) => runtime.presentationRead.text(textId).text;
  const diagnosticExport = (
    <DiagnosticExportButtonV1
      diagnostics={runtime.playerUi.diagnostics}
      sessionStatus={publication.semantic.status}
      label={applicationTextV1(e2eApplicationTextIdsV1.exportDebugBundle)}
      preparingText="正在准备调试包…"
      reviewTitle="检查调试包内容"
      filenameLabel="文件名"
      digestLabel="SHA-256"
      encodedByteLengthLabel="编码后大小"
      categoriesLabel="包含内容"
      categoryLabels={e2eDiagnosticCategoryLabelsV1}
      saveLabel="保存调试包"
      cancelLabel="取消"
      savingText="正在保存调试包…"
      completedText="调试包已保存"
      failedText="调试包操作失败"
    />
  );
  if (stableSessionStatus === "fault_paused") {
    return (
      <RuntimeFailureDialogV1
        title="界面暂时无法继续"
        description="你可以重新加载应用，或先导出诊断信息。"
        retryLabel="重试界面"
        reloadApplicationLabel="重新加载应用"
        requestExitLabel="退出游戏"
        inputRouter={runtime.input}
        actions={Object.freeze({
          retry: null,
          reloadApplication: () => runtime.navigation.reloadApplication(),
          requestExit: null,
        })}
        diagnosticExport={diagnosticExport}
      />
    );
  }
  const SystemRenderer = requireRendererV1(
    runtime.contributions,
    "system",
    e2eUiRendererIdsV1.system,
  );
  const context = Object.freeze({
    viewSlice: publication.view,
    semantic: runtime.application.semantic,
    presentation: runtime.presentationRead,
  }) satisfies E2eUiRendererContextsV1["system"];
  const settingsSection = (
    <E2eSettingsSectionV1
      contentPreference={runtime.contentPreference}
      presentation={runtime.presentationRead}
    />
  );
  return (
    <SystemDialogHostV1
      store={runtime.systemDialogSession}
      inputRouter={runtime.input}
      settings={Object.freeze({
        title: applicationTextV1(e2eApplicationTextIdsV1.settings),
        closeLabel: applicationTextV1(e2eApplicationTextIdsV1.close),
        sections: Object.freeze([settingsSection]),
        emptyText: applicationTextV1(e2eApplicationTextIdsV1.emptySettings),
      })}
    >
      <SystemRenderer {...context} />
      <output
        data-testid="semantic-publication"
        data-semantic-publication="true"
        data-semantic-revision={publication.semantic.revision}
        data-semantic-status={publication.semantic.status}
      >
        {applicationTextV1(e2eApplicationTextIdsV1.semanticStatus)} {publication.semantic.status}，
        {applicationTextV1(e2eApplicationTextIdsV1.semanticRevision)}{" "}
        {publication.semantic.revision}
      </output>
      <Button
        onClick={() =>
          runtime.intents.execute(
            Object.freeze({ kind: "overlay.open" as const, overlayId: "overlay.e2e.test_panel" }),
          )
        }
      >
        {applicationTextV1(e2eApplicationTextIdsV1.openTestPanel)}
      </Button>
      <Button
        onClick={() =>
          runtime.intents.execute(
            Object.freeze({ kind: "overlay.open" as const, overlayId: "overlay.e2e.save" }),
          )
        }
      >
        {applicationTextV1(e2eApplicationTextIdsV1.save)}
      </Button>
      <SettingsLauncherV1 label={applicationTextV1(e2eApplicationTextIdsV1.settings)} />
      {diagnosticExport}
    </SystemDialogHostV1>
  );
}

function createFixedLayersV1(
  runtime: E2ePresentationRuntimeV1,
  publication: E2eRuntimePresentationPublicationV1,
  stableSessionStatus: Exclude<RuntimeSessionStatusV1, "busy">,
): GameStageLayersV1 {
  const HudRenderer = requireRendererV1(runtime.contributions, "hud", e2eUiRendererIdsV1.hud);
  const NarrativeRenderer = requireRendererV1(
    runtime.contributions,
    "narrative",
    e2eUiRendererIdsV1.narrative,
  );
  const flowView = Object.freeze({
    game: publication.view.game,
    actions: publication.semantic.actions,
  });
  const flowContext = Object.freeze({
    viewSlice: flowView,
    semantic: runtime.application.semantic,
    presentation: runtime.presentationRead,
  }) satisfies E2eUiRendererContextsV1["hud"];

  return Object.freeze({
    background: (
      <StageSceneHostV1
        stage={publication.view.stage}
        contributions={runtime.contributions}
        semantic={runtime.application.semantic}
        presentation={runtime.presentationRead}
      />
    ),
    character: createCharacterLayerV1(runtime, publication),
    sceneInteraction: createInteractionLayerV1(runtime, publication),
    hud: (
      <>
        <E2eCanonicalSemanticControlsV1 runtime={runtime} publication={publication} />
        <HudRenderer {...flowContext} />
        {createInteractionEntryV1(runtime, publication)}
      </>
    ),
    workspaceOverlay: (
      <OverlayHostV1
        store={runtime.overlaySession}
        rendererResolver={createOverlayResolverV1(runtime, publication)}
        inputRouter={runtime.input}
        closeLabel={runtime.presentationRead.text(e2eApplicationTextIdsV1.close).text}
      />
    ),
    narrative: <NarrativeRenderer {...flowContext} />,
    system: createSystemLayerV1(runtime, publication, stableSessionStatus),
  });
}

export function E2eApplicationRootV1(props: E2eApplicationRootPropsV1): ReactElement {
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
    () => props.runtime.bindDevDockStateReader(() => devDockOpenStateRef.current),
    [props.runtime],
  );
  const capabilities = useSyncExternalStore(
    props.runtime.application.capabilities.state.subscribe,
    props.runtime.application.capabilities.state.getCurrent,
    props.runtime.application.capabilities.state.getCurrent,
  );
  const [loadedTooling, setLoadedTooling] = useState<{
    readonly runtime: E2ePresentationRuntimeV1;
    readonly contributions: DevDockContributionSetV1;
  } | null>(null);
  useEffect(() => {
    let active = true;
    if (!capabilities.debugTools) {
      return () => {
        active = false;
      };
    }
    void props.runtime
      .loadToolingUiContributions()
      .then((contributions) => {
        if (!active) return;
        setLoadedTooling(Object.freeze({ runtime: props.runtime, contributions }));
      })
      .catch(() => {
        if (!active) return;
        setLoadedTooling((current) => (current?.runtime === props.runtime ? null : current));
      });
    return () => {
      active = false;
    };
  }, [capabilities.debugTools, props.runtime]);
  const devDockContributions =
    capabilities.debugTools && loadedTooling?.runtime === props.runtime
      ? loadedTooling.contributions
      : emptyDevDockContributionsV1;
  const publication = useRuntimePresentationV1(props.runtime.presentation);
  const stableSessionStatusRef = useRef<Exclude<RuntimeSessionStatusV1, "busy">>(
    publication.semantic.status === "busy" ? "ready" : publication.semantic.status,
  );
  if (publication.semantic.status !== "busy") {
    stableSessionStatusRef.current = publication.semantic.status;
  }
  const layers = createFixedLayersV1(props.runtime, publication, stableSessionStatusRef.current);
  const accessibleName = props.runtime.presentationRead.text(
    publication.view.stage.background.accessibleNameTextId,
  ).text;
  const route = publication.view.route;

  return (
    <div
      role="application"
      aria-label="SillyMaker 引擎测试"
      data-application-id={props.runtime.applicationId}
      data-semantic-revision={publication.semantic.revision}
    >
      {route === "main_menu" ? (
        <nav aria-label="引擎测试主菜单">
          <a href="#/play">进入测试</a>
        </nav>
      ) : null}
      <GameShell
        accessibleName={accessibleName}
        layers={layers}
        inputRouter={props.runtime.input}
        devDock={
          <DevDockV1
            capabilities={props.runtime.application.capabilities}
            contributions={devDockContributions}
            inputRouter={props.runtime.input}
            openState={devDockOpenState}
            onOpenStateChange={updateDevDockOpenState}
          />
        }
      />
    </div>
  );
}
