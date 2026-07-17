// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  parseTextId,
  type AssetId,
  type DeepReadonly,
  type HitMapDescriptorV1,
  type LocaleId,
  type ResolvedAssetManifestV1,
  type TextId,
} from "@sillymaker/base";
import {
  InteractionBehaviorListV1,
  InteractionSurfaceV1,
  PaperDollCharacterRendererV1,
  VnLayerV1,
  createUiContributionRegistryV1,
  useInputRouterV1,
  type GameRendererContextV1,
  type GameSymbolRegistryV1,
  type InteractionBehaviorControllerV1,
  type InteractionDescriptorPresentationV1,
  type InteractionSessionStoreV1,
  type InteractionSpatialStateV1,
  type InputRouterV1,
  type PresentationReadPortV1,
  type RuntimeCharacterPresentationV1,
  type RuntimeInteractionSurfaceV1,
  type RuntimeStageSceneV1,
  type UiContributionSetV1,
  type UiRendererNamespaceV1,
  type VnChoiceV1,
} from "@sillymaker/ui";
import type { ReactElement } from "react";

import type { PocSemanticGamePortV1 } from "../application/create-poc-semantic-port.js";
import { characterIdsV1 } from "../content/simulation-ids.js";
import { pocTextIdsV1 } from "../content/text-ids.js";
import type {
  NarrativeProjectionV1,
  PocGameViewV1,
  PocHudProjectionV1,
  PocRejectionReasonV1,
} from "../gameplay/contracts/types.js";
import { pocHeroinePresentationIdsV1 } from "./presentation-ids.js";
import { pocRejectionReasonTextIdsByCodeV1 } from "./rejection-reason-text-ids.js";
import { PocHudV1 } from "./hud/PocHud.js";
import { FacilityOverlayV1 } from "./overlays/FacilityOverlay.js";
import { InventoryOverlayV1 } from "./overlays/InventoryOverlay.js";
import { LedgerOverlayV1 } from "./overlays/LedgerOverlay.js";
import { PolicyOverlayV1 } from "./overlays/PolicyOverlay.js";
import { PurchaseOverlayV1 } from "./overlays/PurchaseOverlay.js";
import { RelationshipOverlayV1 } from "./overlays/RelationshipOverlay.js";
import { RunSummaryOverlayV1 } from "./overlays/RunSummaryOverlay.js";
import { TavernPlanOverlayV1 } from "./overlays/TavernPlanOverlay.js";
import { WorldActionOverlayV1 } from "./overlays/WorldActionOverlay.js";
import type { PocOverlayIdV1 } from "./runtime/contracts.js";
import { pocSceneGraphV1, pocStageRendererIdsV1 } from "./scene-graph.js";
import { PocMainMenuSceneV1 } from "./scenes/PocMainMenuScene.js";
import { PocMarketSceneV1 } from "./scenes/PocMarketScene.js";
import { PocTavernSceneV1 } from "./scenes/PocTavernScene.js";
import { PocWeekSummarySceneV1 } from "./scenes/PocWeekSummaryScene.js";
import { PocWorldMapSceneV1 } from "./scenes/PocWorldMapScene.js";
import type { PocSemanticActionDescriptorV1, PocSemanticInvocationV1 } from "./semantic-actions.js";

type PocAssetUsageV1 = ResolvedAssetManifestV1["assets"][number]["usage"];

export type PocUiPresentationReadPortV1 = PresentationReadPortV1<
  TextId,
  AssetId,
  PocAssetUsageV1,
  LocaleId,
  string
>;

export interface PocInteractionRendererViewV1 {
  readonly surface: RuntimeInteractionSurfaceV1<
    PocSemanticActionDescriptorV1,
    PocSemanticInvocationV1
  >;
  readonly hitMap: HitMapDescriptorV1 | null;
  readonly spatialState: InteractionSpatialStateV1;
}

export interface PocInteractionRendererContextV1 extends GameRendererContextV1<
  PocInteractionRendererViewV1,
  PocSemanticGamePortV1,
  PocUiPresentationReadPortV1
> {
  readonly controller: InteractionBehaviorControllerV1;
  readonly session: InteractionSessionStoreV1;
  readonly inputRouter: InputRouterV1;
}

export interface PocWorkspaceOverlayRendererViewV1 {
  readonly overlayId: PocOverlayIdV1 | null;
  readonly game: PocGameViewV1;
  readonly actions: readonly PocSemanticActionDescriptorV1[];
}

export interface PocNarrativeRendererViewV1 {
  readonly narrative: NarrativeProjectionV1 | null;
  readonly actions: readonly PocSemanticActionDescriptorV1[];
}

export type PocUiRendererContextsV1 = Readonly<{
  background: GameRendererContextV1<
    RuntimeStageSceneV1,
    PocSemanticGamePortV1,
    PocUiPresentationReadPortV1
  >;
  character: GameRendererContextV1<
    RuntimeCharacterPresentationV1,
    PocSemanticGamePortV1,
    PocUiPresentationReadPortV1
  >;
  scene_interaction: PocInteractionRendererContextV1;
  hud: GameRendererContextV1<
    PocHudProjectionV1,
    PocSemanticGamePortV1,
    PocUiPresentationReadPortV1
  > & { readonly gameSymbols: GameSymbolRegistryV1 };
  workspace_overlay: GameRendererContextV1<
    PocWorkspaceOverlayRendererViewV1,
    PocSemanticGamePortV1,
    PocUiPresentationReadPortV1
  > & { readonly gameSymbols: GameSymbolRegistryV1 };
  narrative: GameRendererContextV1<
    PocNarrativeRendererViewV1,
    PocSemanticGamePortV1,
    PocUiPresentationReadPortV1
  >;
  system: GameRendererContextV1<null, PocSemanticGamePortV1, PocUiPresentationReadPortV1>;
}>;

type PocSemanticActionIdV1 = PocSemanticActionDescriptorV1["actionId"];

type PocActionDescriptorForV1<TActionId extends PocSemanticActionIdV1> = Extract<
  PocSemanticActionDescriptorV1,
  { readonly actionId: TActionId }
>;

function uniqueActionDescriptorV1<TActionId extends PocSemanticActionIdV1>(
  actions: readonly DeepReadonly<PocSemanticActionDescriptorV1>[],
  actionId: TActionId,
): DeepReadonly<PocActionDescriptorForV1<TActionId>> | null {
  const matches = actions.filter((descriptor) => descriptor.actionId === actionId);
  if (matches.length !== 1) return null;
  return matches[0] as DeepReadonly<PocActionDescriptorForV1<TActionId>>;
}

function PocCharacterRendererV1(props: PocUiRendererContextsV1["character"]): ReactElement {
  return <PaperDollCharacterRendererV1 {...props} />;
}

const interactionDescriptorPresentationV1 = Object.freeze({
  actionId: (descriptor: DeepReadonly<PocSemanticActionDescriptorV1>) => descriptor.actionId,
  enabled: (descriptor: DeepReadonly<PocSemanticActionDescriptorV1>) => descriptor.enabled,
  reasons: (descriptor: DeepReadonly<PocSemanticActionDescriptorV1>) => descriptor.reasons,
  reasonTextId: (reason: DeepReadonly<PocRejectionReasonV1>) =>
    pocRejectionReasonTextIdsByCodeV1[reason.code],
}) satisfies InteractionDescriptorPresentationV1<
  PocSemanticActionDescriptorV1,
  PocRejectionReasonV1
>;

function PocInteractionRendererV1(
  props: PocUiRendererContextsV1["scene_interaction"],
): ReactElement {
  const view = props.viewSlice;
  return (
    <div data-poc-interaction-surface-id={view.surface.surfaceId}>
      {view.hitMap === null ? null : (
        <InteractionSurfaceV1<PocSemanticActionDescriptorV1, PocSemanticInvocationV1>
          surface={view.surface}
          hitMap={view.hitMap}
          spatialState={view.spatialState}
          inputRouter={props.inputRouter}
          controller={props.controller}
        >
          <span aria-hidden="true" data-poc-spatial-targets="true" />
        </InteractionSurfaceV1>
      )}
      <InteractionBehaviorListV1<
        PocSemanticActionDescriptorV1,
        PocRejectionReasonV1,
        AssetId,
        PocAssetUsageV1,
        LocaleId,
        string
      >
        surface={view.surface}
        session={props.session}
        controller={props.controller}
        presentation={props.presentation}
        descriptorPresentation={interactionDescriptorPresentationV1}
        leaveTextId={pocTextIdsV1.controlCloseLabel}
        inputRouter={props.inputRouter}
      />
    </div>
  );
}

function PocWorkspaceOverlayRendererV1(
  props: PocUiRendererContextsV1["workspace_overlay"],
): ReactElement | null {
  const { actions, game, overlayId } = props.viewSlice;

  switch (overlayId) {
    case null:
      return null;
    case "overlay.poc.policy": {
      const descriptor = uniqueActionDescriptorV1(actions, "action.choose_life_policy");
      return descriptor === null ? null : (
        <PolicyOverlayV1
          descriptor={descriptor}
          semantic={props.semantic}
          presentation={props.presentation}
        />
      );
    }
    case "overlay.poc.inventory":
      return <InventoryOverlayV1 inventory={game.inventory} presentation={props.presentation} />;
    case "overlay.poc.purchase": {
      const descriptor = uniqueActionDescriptorV1(actions, "action.purchase");
      return descriptor === null ? null : (
        <PurchaseOverlayV1
          descriptor={descriptor}
          semantic={props.semantic}
          presentation={props.presentation}
        />
      );
    }
    case "overlay.poc.tavern_plan": {
      const descriptor = uniqueActionDescriptorV1(actions, "action.service_plan");
      return descriptor === null ? null : (
        <TavernPlanOverlayV1
          descriptor={descriptor}
          semantic={props.semantic}
          presentation={props.presentation}
        />
      );
    }
    case "overlay.poc.facility": {
      const descriptor = uniqueActionDescriptorV1(actions, "action.facility_window");
      return descriptor === null ? null : (
        <FacilityOverlayV1
          facilities={game.facilities}
          descriptor={descriptor}
          semantic={props.semantic}
          presentation={props.presentation}
        />
      );
    }
    case "overlay.poc.world_action": {
      const descriptor = uniqueActionDescriptorV1(actions, "action.old_trade_road");
      return descriptor === null ? null : (
        <WorldActionOverlayV1
          descriptor={descriptor}
          semantic={props.semantic}
          presentation={props.presentation}
        />
      );
    }
    case "overlay.poc.ledger":
      return <LedgerOverlayV1 ledger={game.ledger} presentation={props.presentation} />;
    case "overlay.poc.relationship":
      return (
        <RelationshipOverlayV1
          relationship={game.hud.relationship}
          heroineMood={game.hud.heroineMood}
          presentation={props.presentation}
        />
      );
    case "overlay.poc.run_summary":
      return game.completion === null ? null : (
        <RunSummaryOverlayV1 completion={game.completion} presentation={props.presentation} />
      );
    case "overlay.poc.save":
      return null;
  }

  const unsupportedOverlay: never = overlayId;
  return unsupportedOverlay;
}

function disabledNarrativeChoiceV1(
  choiceId: string,
  label: string,
  reasons: readonly string[],
): VnChoiceV1<PocSemanticInvocationV1> {
  return Object.freeze({
    choiceId,
    label,
    enabled: false,
    disabledReasons: Object.freeze([...reasons]),
  });
}

function resolvedReasonTextsV1(
  reasons: readonly DeepReadonly<PocRejectionReasonV1>[],
  presentation: PocUiPresentationReadPortV1,
): readonly string[] {
  return Object.freeze(
    reasons.map((reason) => presentation.text(pocRejectionReasonTextIdsByCodeV1[reason.code]).text),
  );
}

function matchesNarrativeChoiceV1(
  invocation: DeepReadonly<PocSemanticInvocationV1>,
  narrative: DeepReadonly<NarrativeProjectionV1>,
  choiceId: string,
): invocation is DeepReadonly<
  Extract<PocSemanticInvocationV1, { readonly actionId: "action.narrative_choose" }>
> {
  const cursor = narrative.cursor;
  return (
    cursor !== null &&
    invocation.actionId === "action.narrative_choose" &&
    invocation.options.sceneId === cursor.sceneId &&
    invocation.options.nodeId === cursor.nodeId &&
    invocation.options.choiceId === choiceId
  );
}

function projectNarrativeChoicesV1(
  narrative: DeepReadonly<NarrativeProjectionV1>,
  actions: readonly DeepReadonly<PocSemanticActionDescriptorV1>[],
  presentation: PocUiPresentationReadPortV1,
): readonly VnChoiceV1<PocSemanticInvocationV1>[] {
  const descriptor = uniqueActionDescriptorV1(actions, "action.narrative_choose");
  const unknownReferenceText = presentation.text(
    pocRejectionReasonTextIdsByCodeV1["command.unknown_reference"],
  ).text;

  return Object.freeze(
    narrative.choices.map((choice): VnChoiceV1<PocSemanticInvocationV1> => {
      const label = presentation.text(choice.textId).text;
      if (!choice.enabled) {
        const disabledReasonText =
          choice.disabledReasonId === undefined
            ? unknownReferenceText
            : presentation.text(parseTextId(`text.poc.${choice.disabledReasonId}`)).text;
        return disabledNarrativeChoiceV1(choice.choiceId, label, [disabledReasonText]);
      }
      if (descriptor === null || descriptor.delivery !== "choices" || !descriptor.enabled) {
        const descriptorReasons = descriptor === null ? Object.freeze([]) : descriptor.reasons;
        const resolvedReasons = resolvedReasonTextsV1(descriptorReasons, presentation);
        return disabledNarrativeChoiceV1(
          choice.choiceId,
          label,
          resolvedReasons.length === 0 ? [unknownReferenceText] : resolvedReasons,
        );
      }

      const matches = descriptor.options.filter(
        (option) =>
          option.optionId === choice.choiceId &&
          matchesNarrativeChoiceV1(option.invocation, narrative, choice.choiceId),
      );
      if (matches.length !== 1) {
        return disabledNarrativeChoiceV1(choice.choiceId, label, [unknownReferenceText]);
      }

      const option = matches[0];
      if (option === undefined) {
        return disabledNarrativeChoiceV1(choice.choiceId, label, [unknownReferenceText]);
      }
      return Object.freeze({
        choiceId: choice.choiceId,
        label,
        enabled: true,
        disabledReasons: Object.freeze([] as const),
        invocation: option.invocation,
      });
    }),
  );
}

function projectNarrativeAdvanceV1(
  narrative: DeepReadonly<NarrativeProjectionV1>,
  actions: readonly DeepReadonly<PocSemanticActionDescriptorV1>[],
  presentation: PocUiPresentationReadPortV1,
): VnChoiceV1<PocSemanticInvocationV1> | null {
  if (narrative.choices.length !== 0) return null;

  const descriptor = uniqueActionDescriptorV1(actions, "action.narrative_advance");
  const label = presentation.text(
    descriptor?.textId ?? pocTextIdsV1.actionNarrativeAdvanceLabel,
  ).text;
  if (
    descriptor === null ||
    descriptor.delivery !== "direct" ||
    !descriptor.enabled ||
    descriptor.directInvocation.actionId !== "action.narrative_advance"
  ) {
    const descriptorReasons = descriptor === null ? Object.freeze([]) : descriptor.reasons;
    const resolvedReasons = resolvedReasonTextsV1(descriptorReasons, presentation);
    const reasons =
      resolvedReasons.length === 0
        ? Object.freeze([
            presentation.text(pocRejectionReasonTextIdsByCodeV1["command.unknown_reference"]).text,
          ])
        : resolvedReasons;
    return Object.freeze({
      choiceId: "action.narrative_advance",
      label,
      enabled: false,
      disabledReasons: reasons,
    });
  }

  return Object.freeze({
    choiceId: descriptor.actionId,
    label,
    enabled: true,
    disabledReasons: Object.freeze([] as const),
    invocation: descriptor.directInvocation,
  });
}

function narrativeSpeakerLabelV1(
  narrative: DeepReadonly<NarrativeProjectionV1>,
  presentation: PocUiPresentationReadPortV1,
): string | null {
  if (narrative.speakerId === null) return null;
  if (narrative.speakerId === characterIdsV1[0]) {
    return presentation.text(pocTextIdsV1.characterNarratorName).text;
  }
  if (narrative.speakerId === characterIdsV1[1]) {
    return presentation.text(pocTextIdsV1.characterPlayerName).text;
  }
  if (narrative.speakerId === characterIdsV1[2]) {
    return presentation.text(pocTextIdsV1.characterHeroineName).text;
  }
  return null;
}

function PocNarrativeRendererV1(props: PocUiRendererContextsV1["narrative"]): ReactElement | null {
  const inputRouter = useInputRouterV1();
  const narrative = props.viewSlice.narrative;
  if (narrative === null || narrative.status !== "active") return null;

  const choices = projectNarrativeChoicesV1(narrative, props.viewSlice.actions, props.presentation);
  const advance = projectNarrativeAdvanceV1(narrative, props.viewSlice.actions, props.presentation);
  const fallbackTextId =
    narrative.choices.length === 0
      ? pocTextIdsV1.actionNarrativeAdvanceLabel
      : pocTextIdsV1.actionNarrativeChooseLabel;

  return (
    <VnLayerV1
      active
      accessibleName={props.presentation.text(pocTextIdsV1.storyTitle).text}
      speakerLabel={narrativeSpeakerLabelV1(narrative, props.presentation)}
      text={props.presentation.text(narrative.textId ?? fallbackTextId).text}
      choices={choices}
      advance={advance}
      semantic={props.semantic}
      inputRouter={inputRouter}
    />
  );
}

function PocSystemRendererV1(_props: PocUiRendererContextsV1["system"]): ReactElement | null {
  return null;
}

const pocBackgroundContributionsV1 = Object.freeze([
  Object.freeze({
    rendererId: pocStageRendererIdsV1.mainMenu,
    component: PocMainMenuSceneV1,
  }),
  Object.freeze({ rendererId: pocStageRendererIdsV1.tavern, component: PocTavernSceneV1 }),
  Object.freeze({ rendererId: pocStageRendererIdsV1.market, component: PocMarketSceneV1 }),
  Object.freeze({ rendererId: pocStageRendererIdsV1.worldMap, component: PocWorldMapSceneV1 }),
  Object.freeze({
    rendererId: pocStageRendererIdsV1.weekSummary,
    component: PocWeekSummarySceneV1,
  }),
]);

const pocCharacterContributionsV1 = Object.freeze([
  Object.freeze({
    rendererId: pocHeroinePresentationIdsV1.rendererId,
    component: PocCharacterRendererV1,
  }),
]);

export const pocFixedRendererIdsV1 = Object.freeze({
  sceneInteraction: "renderer.poc.interaction.stage",
  hud: "renderer.poc.hud.compact",
  workspaceOverlay: "renderer.poc.overlay.host",
  narrative: "renderer.poc.narrative.vn",
  system: "renderer.poc.system.host",
} as const);

export const pocUiContributionsV1 = Object.freeze({
  contributionId: "ui.poc.presentation.v1",
  renderers: Object.freeze({
    background: pocBackgroundContributionsV1,
    character: pocCharacterContributionsV1,
    scene_interaction: Object.freeze([
      Object.freeze({
        rendererId: pocFixedRendererIdsV1.sceneInteraction,
        component: PocInteractionRendererV1,
      }),
    ]),
    hud: Object.freeze([
      Object.freeze({ rendererId: pocFixedRendererIdsV1.hud, component: PocHudV1 }),
    ]),
    workspace_overlay: Object.freeze([
      Object.freeze({
        rendererId: pocFixedRendererIdsV1.workspaceOverlay,
        component: PocWorkspaceOverlayRendererV1,
      }),
    ]),
    narrative: Object.freeze([
      Object.freeze({
        rendererId: pocFixedRendererIdsV1.narrative,
        component: PocNarrativeRendererV1,
      }),
    ]),
    system: Object.freeze([
      Object.freeze({ rendererId: pocFixedRendererIdsV1.system, component: PocSystemRendererV1 }),
    ]),
  }),
}) satisfies UiContributionSetV1<PocUiRendererContextsV1>;

const rendererNamespacesV1 = Object.freeze([
  "background",
  "character",
  "scene_interaction",
  "hud",
  "workspace_overlay",
  "narrative",
  "system",
] as const satisfies readonly UiRendererNamespaceV1[]);

function assertExactRendererClosureV1(
  namespace: "background" | "character",
  expectedIds: readonly string[],
): void {
  const contributions = pocUiContributionsV1.renderers[namespace];
  const actualIds = contributions.map(({ rendererId }) => rendererId);
  if (
    actualIds.length !== expectedIds.length ||
    actualIds.some((rendererId, index) => rendererId !== expectedIds[index])
  ) {
    throw new TypeError(`ui.poc.renderer_closure_mismatch:${namespace}`);
  }
}

function validatePocContributionClosureV1(): void {
  const actualNamespaces = Object.keys(pocUiContributionsV1.renderers).sort();
  const expectedNamespaces = [...rendererNamespacesV1].sort();
  if (
    actualNamespaces.length !== expectedNamespaces.length ||
    actualNamespaces.some((namespace, index) => namespace !== expectedNamespaces[index])
  ) {
    throw new TypeError("ui.poc.renderer_namespace_closure_mismatch");
  }

  const expectedBackgroundIds = Object.freeze([
    ...new Set(pocSceneGraphV1.variants.map(({ rendererId }) => rendererId)),
  ]);
  const expectedCharacterIds = Object.freeze([
    ...new Set(pocSceneGraphV1.characterRigs.map(({ rendererId }) => rendererId)),
  ]);
  assertExactRendererClosureV1("background", expectedBackgroundIds);
  assertExactRendererClosureV1("character", expectedCharacterIds);

  const registry = createUiContributionRegistryV1<PocUiRendererContextsV1>([pocUiContributionsV1]);
  for (const rendererId of expectedBackgroundIds) {
    if (registry.resolve("background", rendererId).kind !== "found") {
      throw new TypeError(`ui.poc.renderer_missing:background:${rendererId}`);
    }
  }
  for (const rendererId of expectedCharacterIds) {
    if (registry.resolve("character", rendererId).kind !== "found") {
      throw new TypeError(`ui.poc.renderer_missing:character:${rendererId}`);
    }
  }
}

validatePocContributionClosureV1();
