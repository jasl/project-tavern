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
  createUiContributionRegistryV1,
  InteractionBehaviorListV1,
  InteractionSurfaceV1,
  PaperDollCharacterRendererV1,
  SemanticActionControlV1,
  StaticCharacterRendererV1,
  TopCardHudV1,
  VnLayerV1,
  useInputRouterV1,
  type GameRendererContextV1,
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
  type VnChoiceV1,
} from "@sillymaker/ui";
import type { CSSProperties, ReactElement } from "react";

import type { E2eGameViewV1, E2eRejectionReasonV1 } from "../gameplay/contracts/index.js";
import type {
  E2eSemanticActionDescriptorV1,
  E2eSemanticGamePortV1,
  E2eSemanticInvocationV1,
} from "../runtime/e2e-semantic-game-port.js";
import { isE2eNarrativeOpenV1, type E2eRuntimePresentationViewV1 } from "./runtime-presentation.js";
import {
  e2eCharacterRendererIdV1,
  e2eStageRendererIdV1,
  e2eStaticCharacterRendererIdV1,
} from "./scene-graph.js";

type E2eAssetUsageV1 = ResolvedAssetManifestV1["assets"][number]["usage"];

export type E2eUiPresentationReadPortV1 = PresentationReadPortV1<
  TextId,
  AssetId,
  E2eAssetUsageV1,
  LocaleId,
  string
>;

export interface E2eInteractionRendererViewV1 {
  readonly surface: DeepReadonly<
    RuntimeInteractionSurfaceV1<E2eSemanticActionDescriptorV1, E2eSemanticInvocationV1>
  >;
  readonly hitMap: DeepReadonly<HitMapDescriptorV1>;
  readonly spatialState: InteractionSpatialStateV1;
  readonly activeCueId: string | null;
}

export interface E2eInteractionRendererContextV1 extends GameRendererContextV1<
  E2eInteractionRendererViewV1,
  E2eSemanticGamePortV1,
  E2eUiPresentationReadPortV1
> {
  readonly controller: InteractionBehaviorControllerV1;
  readonly session: InteractionSessionStoreV1;
  readonly inputRouter: InputRouterV1;
}

export interface E2eFlowRendererViewV1 {
  readonly game: DeepReadonly<E2eGameViewV1>;
  readonly actions: readonly DeepReadonly<E2eSemanticActionDescriptorV1>[];
}

export interface E2eFlowActionOptionV1 {
  readonly descriptor: DeepReadonly<E2eSemanticActionDescriptorV1>;
  readonly invocation: DeepReadonly<E2eSemanticInvocationV1>;
  readonly optionIndex: number;
}

type E2eFlowRendererContextV1 = GameRendererContextV1<
  E2eFlowRendererViewV1,
  E2eSemanticGamePortV1,
  E2eUiPresentationReadPortV1
>;

export type E2eUiRendererContextsV1 = Readonly<{
  background: GameRendererContextV1<
    RuntimeStageSceneV1,
    E2eSemanticGamePortV1,
    E2eUiPresentationReadPortV1
  >;
  character: GameRendererContextV1<
    RuntimeCharacterPresentationV1,
    E2eSemanticGamePortV1,
    E2eUiPresentationReadPortV1
  >;
  scene_interaction: E2eInteractionRendererContextV1;
  hud: E2eFlowRendererContextV1;
  workspace_overlay: GameRendererContextV1<
    E2eRuntimePresentationViewV1,
    E2eSemanticGamePortV1,
    E2eUiPresentationReadPortV1
  >;
  narrative: E2eFlowRendererContextV1;
  system: GameRendererContextV1<
    E2eRuntimePresentationViewV1,
    E2eSemanticGamePortV1,
    E2eUiPresentationReadPortV1
  >;
}>;

export const e2eUiRendererIdsV1 = Object.freeze({
  background: e2eStageRendererIdV1,
  characterLayered: e2eCharacterRendererIdV1,
  characterStatic: e2eStaticCharacterRendererIdV1,
  interaction: "renderer.e2e.interaction.counter",
  hud: "renderer.e2e.hud.compact",
  overlay: "renderer.e2e.overlay.neutral",
  narrative: "renderer.e2e.narrative.host",
  system: "renderer.e2e.system.host",
});

const textIdsV1 = Object.freeze({
  leaveInteraction: parseTextId("text.e2e.interaction.leave"),
  hudName: parseTextId("text.e2e.hud.name"),
  overlayName: parseTextId("text.e2e.overlay.test_panel.name"),
  narrativeName: parseTextId("text.e2e.narrative.name"),
  systemName: parseTextId("text.e2e.system.name"),
  alphaCue: parseTextId("text.e2e.cue.counter.alpha"),
  betaCue: parseTextId("text.e2e.cue.counter.beta"),
  unavailableReason: parseTextId("text.e2e.reason.flow_unavailable"),
  summaryName: parseTextId("text.e2e.stage.summary.name"),
});

const hudActionIdsV1 = Object.freeze([
  "action.e2e.start",
  "action.e2e.complete",
] as const satisfies readonly E2eSemanticInvocationV1["actionId"][]);
const backgroundStyleV1 = Object.freeze({
  position: "absolute",
  inset: 0,
  display: "grid",
  placeItems: "center",
  background:
    "linear-gradient(150deg, color-mix(in srgb, Canvas 82%, #355 18%), color-mix(in srgb, Canvas 90%, #624 10%))",
  color: "CanvasText",
}) satisfies CSSProperties;

const cueStyleV1 = Object.freeze({
  display: "inline-block",
  padding: "0.25rem 0.5rem",
  border: "1px solid currentcolor",
  borderRadius: "999px",
}) satisfies CSSProperties;

const interactionRootStyleV1 = Object.freeze({
  position: "absolute",
  inset: 0,
  display: "grid",
}) satisfies CSSProperties;

const interactionSpatialPlaneStyleV1 = Object.freeze({
  gridArea: "1 / 1",
  minInlineSize: 0,
  minBlockSize: 0,
}) satisfies CSSProperties;

const interactionSpatialWitnessStyleV1 = Object.freeze({
  position: "absolute",
  inset: 0,
}) satisfies CSSProperties;

const interactionSemanticPlaneStyleV1 = Object.freeze({
  gridArea: "1 / 1",
  alignSelf: "start",
  justifySelf: "start",
  zIndex: 1,
  display: "grid",
  gap: "0.5rem",
  maxInlineSize: "100%",
  maxBlockSize: "100%",
  overflow: "auto",
}) satisfies CSSProperties;

function E2eCssBackgroundV1(props: E2eUiRendererContextsV1["background"]): ReactElement {
  const stage = props.viewSlice;
  const accessibleName = props.presentation.text(stage.background.accessibleNameTextId).text;
  return (
    <div
      role="img"
      aria-label={accessibleName}
      data-renderer-id={e2eUiRendererIdsV1.background}
      data-stage-scene-id={stage.stageSceneId}
      data-stage-variant-id={stage.variantId}
      style={backgroundStyleV1}
    />
  );
}

function E2eLayeredCounterV1(props: E2eUiRendererContextsV1["character"]): ReactElement {
  return <PaperDollCharacterRendererV1 {...props} />;
}

function E2eStaticCounterV1(props: E2eUiRendererContextsV1["character"]): ReactElement {
  return <StaticCharacterRendererV1 {...props} />;
}

const descriptorPresentationV1 = Object.freeze({
  actionId: (descriptor: DeepReadonly<E2eSemanticActionDescriptorV1>) => descriptor.actionId,
  enabled: (descriptor: DeepReadonly<E2eSemanticActionDescriptorV1>) => descriptor.enabled,
  reasons: (descriptor: DeepReadonly<E2eSemanticActionDescriptorV1>) => descriptor.reasons,
  reasonTextId: (_reason: DeepReadonly<E2eRejectionReasonV1>) => textIdsV1.unavailableReason,
}) satisfies InteractionDescriptorPresentationV1<
  E2eSemanticActionDescriptorV1,
  E2eRejectionReasonV1
>;

function projectedCueTextIdV1(view: DeepReadonly<E2eInteractionRendererViewV1>): TextId | null {
  const activeCueId = view.activeCueId;
  if (activeCueId !== "cue.e2e.counter.alpha" && activeCueId !== "cue.e2e.counter.beta") {
    return null;
  }
  const cueIsProjected = view.surface.targets.some((target) =>
    target.behaviors.some(
      (behavior) =>
        behavior.route.kind === "presentation_intent" &&
        behavior.route.intent.kind === "presentation.play_cue" &&
        behavior.route.intent.cueId === activeCueId,
    ),
  );
  if (!cueIsProjected) return null;
  return activeCueId === "cue.e2e.counter.alpha" ? textIdsV1.alphaCue : textIdsV1.betaCue;
}

function E2eCounterInteractionV1(
  props: E2eUiRendererContextsV1["scene_interaction"],
): ReactElement {
  const view = props.viewSlice;
  const cueTextId = projectedCueTextIdV1(view);
  return (
    <div data-e2e-counter-interaction="true" style={interactionRootStyleV1}>
      <div data-e2e-interaction-layer="spatial" style={interactionSpatialPlaneStyleV1}>
        <InteractionSurfaceV1
          surface={view.surface}
          hitMap={view.hitMap}
          spatialState={view.spatialState}
          inputRouter={props.inputRouter}
          controller={props.controller}
        >
          <span
            data-testid="spatial-increment-target"
            aria-hidden="true"
            style={interactionSpatialWitnessStyleV1}
          />
        </InteractionSurfaceV1>
      </div>
      <div data-e2e-interaction-layer="controls" style={interactionSemanticPlaneStyleV1}>
        <InteractionBehaviorListV1
          surface={view.surface}
          session={props.session}
          controller={props.controller}
          presentation={props.presentation}
          descriptorPresentation={descriptorPresentationV1}
          leaveTextId={textIdsV1.leaveInteraction}
          inputRouter={props.inputRouter}
        />
        {cueTextId === null ? null : (
          <span
            role="status"
            data-content-cue-id={view.activeCueId ?? undefined}
            style={cueStyleV1}
          >
            {props.presentation.text(cueTextId).text}
          </span>
        )}
      </div>
    </div>
  );
}

function flowOptionTextIdV1(
  descriptor: DeepReadonly<E2eSemanticActionDescriptorV1>,
  invocation: DeepReadonly<E2eSemanticInvocationV1>,
): TextId {
  if (descriptor.actionId === "action.e2e.choose") {
    if (invocation.actionId !== descriptor.actionId) {
      throw new TypeError(`invalid E2E flow option for ${descriptor.actionId}`);
    }
    return parseTextId(`${descriptor.textId}.${invocation.parameters.choice}`);
  }
  if (descriptor.options.length !== 1 || invocation.actionId !== descriptor.actionId) {
    throw new TypeError(`invalid E2E flow option for ${descriptor.actionId}`);
  }
  return descriptor.textId;
}

export function selectE2eFlowActionOptionsV1(
  actions: readonly DeepReadonly<E2eSemanticActionDescriptorV1>[],
  actionIds: readonly E2eSemanticInvocationV1["actionId"][],
): readonly E2eFlowActionOptionV1[] {
  return Object.freeze(
    actions.flatMap((descriptor) =>
      actionIds.includes(descriptor.actionId)
        ? descriptor.options.map((invocation, optionIndex) =>
            Object.freeze({ descriptor, invocation, optionIndex }),
          )
        : [],
    ),
  );
}

function E2eSemanticActionGroupV1(props: {
  readonly context: E2eFlowRendererContextV1;
  readonly actionIds: readonly E2eSemanticInvocationV1["actionId"][];
  readonly accessibleName: string;
}): ReactElement | null {
  if (props.context.viewSlice.game.terminal) return null;
  return (
    <div role="group" aria-label={props.accessibleName}>
      {selectE2eFlowActionOptionsV1(props.context.viewSlice.actions, props.actionIds).map(
        ({ descriptor, invocation, optionIndex }) => {
          const disabledReasonLabels = Object.freeze(
            descriptor.reasons.map(
              () => props.context.presentation.text(textIdsV1.unavailableReason).text,
            ),
          );
          return (
            <SemanticActionControlV1
              key={`${descriptor.actionId}:${optionIndex}`}
              descriptor={descriptor}
              invocation={invocation}
              semantic={props.context.semantic}
              label={
                props.context.presentation.text(flowOptionTextIdV1(descriptor, invocation)).text
              }
              disabledReasonLabels={disabledReasonLabels}
            />
          );
        },
      )}
    </div>
  );
}

function E2eCompactHudV1(props: E2eUiRendererContextsV1["hud"]): ReactElement {
  const accessibleName = props.presentation.text(textIdsV1.hudName).text;
  return (
    <TopCardHudV1
      accessibleName={accessibleName}
      slots={Object.freeze({
        start: <span>{props.viewSlice.game.counterLabel}</span>,
        center: props.viewSlice.game.terminal ? (
          <h1>{props.presentation.text(textIdsV1.summaryName).text}</h1>
        ) : (
          <E2eSemanticActionGroupV1
            context={props}
            actionIds={hudActionIdsV1}
            accessibleName={accessibleName}
          />
        ),
        end: null,
      })}
    />
  );
}

function E2eNeutralOverlayV1(
  props: E2eUiRendererContextsV1["workspace_overlay"],
): ReactElement | null {
  const accessibleName = props.presentation.text(textIdsV1.overlayName).text;
  if (props.viewSlice.activeOverlayId !== "overlay.e2e.test_panel") return null;
  return (
    <section data-e2e-overlay-id="overlay.e2e.test_panel">
      <h2>{accessibleName}</h2>
    </section>
  );
}

function projectE2eVnChoiceV1(
  option: E2eFlowActionOptionV1,
  presentation: E2eUiPresentationReadPortV1,
): VnChoiceV1<E2eSemanticInvocationV1> {
  const label = presentation.text(flowOptionTextIdV1(option.descriptor, option.invocation)).text;
  if (!option.descriptor.enabled) {
    return Object.freeze({
      choiceId: `${option.descriptor.actionId}:${option.optionIndex}`,
      label,
      enabled: false,
      disabledReasons: Object.freeze(
        option.descriptor.reasons.map(() => presentation.text(textIdsV1.unavailableReason).text),
      ),
    });
  }
  return Object.freeze({
    choiceId: `${option.descriptor.actionId}:${option.optionIndex}`,
    label,
    enabled: true,
    disabledReasons: Object.freeze([] as const),
    invocation: option.invocation,
  });
}

function E2eNarrativeHostV1(props: E2eUiRendererContextsV1["narrative"]): ReactElement | null {
  const inputRouter = useInputRouterV1();
  const accessibleName = props.presentation.text(textIdsV1.narrativeName).text;
  const status = props.viewSlice.game.flow.status;
  const active = isE2eNarrativeOpenV1(status);
  const choices =
    status === "choosing"
      ? selectE2eFlowActionOptionsV1(props.viewSlice.actions, ["action.e2e.choose"]).map((option) =>
          projectE2eVnChoiceV1(option, props.presentation),
        )
      : Object.freeze([]);
  const advanceOption =
    status === "blocked"
      ? selectE2eFlowActionOptionsV1(props.viewSlice.actions, ["action.e2e.continue"])[0]
      : undefined;
  const advance =
    advanceOption === undefined ? null : projectE2eVnChoiceV1(advanceOption, props.presentation);
  return (
    <VnLayerV1
      active={active}
      accessibleName={accessibleName}
      speakerLabel={null}
      text={
        props.presentation.text(
          parseTextId(`text.e2e.flow.node.${props.viewSlice.game.flow.nodeId}`),
        ).text
      }
      choices={choices}
      advance={advance}
      semantic={props.semantic}
      inputRouter={inputRouter}
    />
  );
}

function E2eSystemHostV1(props: E2eUiRendererContextsV1["system"]): ReactElement {
  const accessibleName = props.presentation.text(textIdsV1.systemName).text;
  return (
    <section aria-label={accessibleName} data-e2e-system-host="true">
      <span>{accessibleName}</span>
    </section>
  );
}

export const e2eUiContributionsV1 = Object.freeze({
  contributionId: "ui.e2e.presentation.v1",
  renderers: Object.freeze({
    background: Object.freeze([
      Object.freeze({
        rendererId: e2eUiRendererIdsV1.background,
        component: E2eCssBackgroundV1,
      }),
    ]),
    character: Object.freeze([
      Object.freeze({
        rendererId: e2eUiRendererIdsV1.characterLayered,
        component: E2eLayeredCounterV1,
      }),
      Object.freeze({
        rendererId: e2eUiRendererIdsV1.characterStatic,
        component: E2eStaticCounterV1,
      }),
    ]),
    scene_interaction: Object.freeze([
      Object.freeze({
        rendererId: e2eUiRendererIdsV1.interaction,
        component: E2eCounterInteractionV1,
      }),
    ]),
    hud: Object.freeze([
      Object.freeze({ rendererId: e2eUiRendererIdsV1.hud, component: E2eCompactHudV1 }),
    ]),
    workspace_overlay: Object.freeze([
      Object.freeze({
        rendererId: e2eUiRendererIdsV1.overlay,
        component: E2eNeutralOverlayV1,
      }),
    ]),
    narrative: Object.freeze([
      Object.freeze({
        rendererId: e2eUiRendererIdsV1.narrative,
        component: E2eNarrativeHostV1,
      }),
    ]),
    system: Object.freeze([
      Object.freeze({ rendererId: e2eUiRendererIdsV1.system, component: E2eSystemHostV1 }),
    ]),
  }),
}) satisfies UiContributionSetV1<E2eUiRendererContextsV1>;

export const e2eUiContributionRegistryV1 = createUiContributionRegistryV1<E2eUiRendererContextsV1>([
  e2eUiContributionsV1,
]);
