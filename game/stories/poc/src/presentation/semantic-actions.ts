// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import type { DeepReadonly, RuntimeSchemaV1, TextId } from "@sillymaker/base";
import type { GameSessionV1 } from "@sillymaker/base/runtime";

import { actionIdsV1, pocSemanticWorkflowActionIdsV1, pocTextIdsV1 } from "../content/ids.js";
import {
  pocGameCommandSchemaV1,
  pocRejectionReasonSchemaV1,
} from "../gameplay/contracts/schemas.js";
import type {
  ActionViewV1,
  CommandPreviewV1,
  PocActionInputCatalogV1,
  PocGameCommandV1,
  PocGameQueriesV1,
  PocGameSimulationTypesV1,
  PocRejectionReasonV1,
} from "../gameplay/contracts/types.js";

type PocCommandOptionsV1<TKind extends PocGameCommandV1["kind"]> = Omit<
  Extract<PocGameCommandV1, { readonly kind: TKind }>,
  "kind"
>;

export type PocNoSemanticOptionsV1 = Readonly<Record<string, never>>;

export interface PocSemanticInvocationOptionsByActionV1 {
  readonly "action.choose_life_policy": PocCommandOptionsV1<"policy.choose">;
  readonly "action.purchase": PocCommandOptionsV1<"inventory.buy">;
  readonly "action.prepare_food": PocNoSemanticOptionsV1;
  readonly "action.rest": PocNoSemanticOptionsV1;
  readonly "action.service_plan": PocCommandOptionsV1<"tavern.plan.set">;
  readonly "action.advance_phase": PocNoSemanticOptionsV1;
  readonly "action.pay_levy": PocNoSemanticOptionsV1;
  readonly "action.facility_window": Omit<PocCommandOptionsV1<"facility.choose">, "opportunityId">;
  readonly "action.repair_sign_with_heroine": PocNoSemanticOptionsV1;
  readonly "action.old_trade_road": Omit<PocCommandOptionsV1<"world.action.begin">, "actionId">;
  readonly "action.apologize_to_heroine": PocNoSemanticOptionsV1;
  readonly "action.run_start": PocNoSemanticOptionsV1;
  readonly "action.tavern_opening_start": PocNoSemanticOptionsV1;
  readonly "action.tavern_opening_continue": PocNoSemanticOptionsV1;
  readonly "action.tavern_opening_finalize": PocNoSemanticOptionsV1;
  readonly "action.world_action_complete": PocNoSemanticOptionsV1;
  readonly "action.narrative_advance": PocNoSemanticOptionsV1;
  readonly "action.narrative_choose": PocCommandOptionsV1<"narrative.choose">;
}

export type PocSemanticInvocationV1 = {
  readonly [TActionId in keyof PocSemanticInvocationOptionsByActionV1]: {
    readonly kind: "invoke";
    readonly actionId: TActionId;
    readonly options: DeepReadonly<PocSemanticInvocationOptionsByActionV1[TActionId]>;
  };
}[keyof PocSemanticInvocationOptionsByActionV1];

export interface PocSemanticActionOptionV1<TInvocation extends PocSemanticInvocationV1> {
  readonly optionId: string;
  readonly textId: TextId;
  readonly invocation: DeepReadonly<TInvocation>;
}

export interface PocSemanticFormByActionV1 {
  readonly "action.purchase": {
    readonly kind: "purchase";
    readonly actionId: "action.purchase";
    readonly input: DeepReadonly<PocActionInputCatalogV1["purchase"]>;
  };
  readonly "action.service_plan": {
    readonly kind: "tavern_plan";
    readonly actionId: "action.service_plan";
    readonly input: DeepReadonly<PocActionInputCatalogV1["tavernPlan"]>;
  };
}

export interface PocSemanticDeliveryKindByActionV1 {
  readonly "action.choose_life_policy": "choices";
  readonly "action.purchase": "form";
  readonly "action.prepare_food": "direct";
  readonly "action.rest": "direct";
  readonly "action.service_plan": "form";
  readonly "action.advance_phase": "direct";
  readonly "action.pay_levy": "direct";
  readonly "action.facility_window": "choices";
  readonly "action.repair_sign_with_heroine": "direct";
  readonly "action.old_trade_road": "choices";
  readonly "action.apologize_to_heroine": "direct";
  readonly "action.run_start": "direct";
  readonly "action.tavern_opening_start": "direct";
  readonly "action.tavern_opening_continue": "direct";
  readonly "action.tavern_opening_finalize": "direct";
  readonly "action.world_action_complete": "direct";
  readonly "action.narrative_advance": "direct";
  readonly "action.narrative_choose": "choices";
}

type PocSemanticActionIdV1 = keyof PocSemanticInvocationOptionsByActionV1;

type PocWorkflowSemanticActionIdV1 =
  | "action.run_start"
  | "action.tavern_opening_start"
  | "action.tavern_opening_continue"
  | "action.tavern_opening_finalize"
  | "action.world_action_complete"
  | "action.narrative_advance"
  | "action.narrative_choose";

type PocAuthoredSemanticActionIdV1 = Exclude<PocSemanticActionIdV1, PocWorkflowSemanticActionIdV1>;

type PocSemanticActionDeliveryV1<TActionId extends PocSemanticActionIdV1> =
  PocSemanticDeliveryKindByActionV1[TActionId] extends "direct"
    ? {
        readonly delivery: "direct";
        readonly directInvocation: DeepReadonly<
          Extract<PocSemanticInvocationV1, { readonly actionId: TActionId }>
        >;
        readonly options: readonly [];
        readonly form: null;
      }
    : PocSemanticDeliveryKindByActionV1[TActionId] extends "choices"
      ? {
          readonly delivery: "choices";
          readonly directInvocation: null;
          readonly options: readonly [
            DeepReadonly<
              PocSemanticActionOptionV1<
                Extract<PocSemanticInvocationV1, { readonly actionId: TActionId }>
              >
            >,
            ...DeepReadonly<
              PocSemanticActionOptionV1<
                Extract<PocSemanticInvocationV1, { readonly actionId: TActionId }>
              >
            >[],
          ];
          readonly form: null;
        }
      : TActionId extends keyof PocSemanticFormByActionV1
        ? {
            readonly delivery: "form";
            readonly directInvocation: null;
            readonly options: readonly [];
            readonly form: DeepReadonly<PocSemanticFormByActionV1[TActionId]>;
          }
        : never;

export type PocSemanticConfirmationV1 = NonNullable<
  Extract<CommandPreviewV1, { readonly allowed: true }>["confirmation"]
>;

export type PocSemanticActionDescriptorV1 = {
  readonly [TActionId in PocSemanticActionIdV1]: {
    readonly actionId: TActionId;
    readonly textId: TextId;
    readonly enabled: boolean;
    readonly reasons: readonly DeepReadonly<PocRejectionReasonV1>[];
    readonly confirmation: DeepReadonly<PocSemanticConfirmationV1> | null;
  } & PocSemanticActionDeliveryV1<TActionId>;
}[PocSemanticActionIdV1];

export type PocSemanticPreviewV1 = CommandPreviewV1;

export type PocSemanticActionResultV1 =
  | { readonly kind: "committed" }
  | {
      readonly kind: "rejected";
      readonly reasons: readonly DeepReadonly<PocRejectionReasonV1>[];
    }
  | {
      readonly kind: "not_executed";
      readonly code:
        "session_unavailable" | "fault_paused" | "hmr_invalidated" | "validation_failed";
    }
  | { readonly kind: "faulted"; readonly code: "gameplay_fault" };

export type PocSemanticInvocationErrorCodeV1 =
  "semantic.action_unknown" | "semantic.invocation_invalid" | "semantic.options_invalid";

export class PocSemanticInvocationErrorV1 extends TypeError {
  readonly code: PocSemanticInvocationErrorCodeV1;

  constructor(code: PocSemanticInvocationErrorCodeV1, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PocSemanticInvocationErrorV1";
    this.code = code;
  }
}

type ExactDataObjectV1 = Readonly<Record<string, unknown>>;

function requireExactDataObjectV1(
  value: unknown,
  keys: readonly string[],
  label: string,
): ExactDataObjectV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length > 0
  ) {
    throw new TypeError(`${label} must be a plain object`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actualKeys = Object.keys(descriptors).sort();
  const expectedKeys = [...keys].sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw new TypeError(`${label} has invalid keys`);
  }
  const result: Record<string, unknown> = {};
  for (const key of expectedKeys) {
    const descriptor = descriptors[key];
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError(`${label} has an invalid ${key} property`);
    }
    result[key] = descriptor.value;
  }
  return Object.freeze(result);
}

function semanticOptionsSchemaV1<T>(parser: (value: unknown) => T): RuntimeSchemaV1<T> {
  return Object.freeze({ parse: parser });
}

const noSemanticOptionsSchemaV1 = semanticOptionsSchemaV1<PocNoSemanticOptionsV1>((value) => {
  requireExactDataObjectV1(value, [], "PoC Semantic options");
  return Object.freeze({});
});

const chooseLifePolicyOptionsSchemaV1 = semanticOptionsSchemaV1<
  PocSemanticInvocationOptionsByActionV1["action.choose_life_policy"]
>((value) => {
  const options = requireExactDataObjectV1(value, ["policyId"], "PoC Semantic options");
  const command = pocGameCommandSchemaV1.parse({
    kind: "policy.choose",
    policyId: options.policyId,
  });
  if (command.kind !== "policy.choose") throw new TypeError("invalid policy command");
  return Object.freeze({ policyId: command.policyId });
});

const purchaseOptionsSchemaV1 = semanticOptionsSchemaV1<
  PocSemanticInvocationOptionsByActionV1["action.purchase"]
>((value) => {
  const options = requireExactDataObjectV1(value, ["lines"], "PoC Semantic options");
  const command = pocGameCommandSchemaV1.parse({ kind: "inventory.buy", lines: options.lines });
  if (command.kind !== "inventory.buy") throw new TypeError("invalid purchase command");
  return Object.freeze({ lines: command.lines });
});

const tavernPlanOptionsSchemaV1 = semanticOptionsSchemaV1<
  PocSemanticInvocationOptionsByActionV1["action.service_plan"]
>((value) => {
  const options = requireExactDataObjectV1(value, ["plan"], "PoC Semantic options");
  const command = pocGameCommandSchemaV1.parse({ kind: "tavern.plan.set", plan: options.plan });
  if (command.kind !== "tavern.plan.set") throw new TypeError("invalid Tavern plan command");
  return Object.freeze({ plan: command.plan });
});

const facilityOptionsSchemaV1 = semanticOptionsSchemaV1<
  PocSemanticInvocationOptionsByActionV1["action.facility_window"]
>((value) => {
  const options = requireExactDataObjectV1(value, ["choice"], "PoC Semantic options");
  const command = pocGameCommandSchemaV1.parse({
    kind: "facility.choose",
    opportunityId: actionIdsV1[7],
    choice: options.choice,
  });
  if (command.kind !== "facility.choose") throw new TypeError("invalid Facility command");
  return Object.freeze({ choice: command.choice });
});

const worldActionOptionsSchemaV1 = semanticOptionsSchemaV1<
  PocSemanticInvocationOptionsByActionV1["action.old_trade_road"]
>((value) => {
  const options = requireExactDataObjectV1(value, ["optionId"], "PoC Semantic options");
  const command = pocGameCommandSchemaV1.parse({
    kind: "world.action.begin",
    actionId: actionIdsV1[9],
    optionId: options.optionId,
  });
  if (command.kind !== "world.action.begin") throw new TypeError("invalid WorldAction command");
  return Object.freeze({ optionId: command.optionId });
});

const narrativeChoiceOptionsSchemaV1 = semanticOptionsSchemaV1<
  PocSemanticInvocationOptionsByActionV1["action.narrative_choose"]
>((value) => {
  const options = requireExactDataObjectV1(
    value,
    ["sceneId", "nodeId", "choiceId"],
    "PoC Semantic options",
  );
  const command = pocGameCommandSchemaV1.parse({
    kind: "narrative.choose",
    sceneId: options.sceneId,
    nodeId: options.nodeId,
    choiceId: options.choiceId,
  });
  if (command.kind !== "narrative.choose") throw new TypeError("invalid Narrative command");
  return Object.freeze({
    sceneId: command.sceneId,
    nodeId: command.nodeId,
    choiceId: command.choiceId,
  });
});

type PocSemanticInvocationOptionsSchemaMapV1 = {
  readonly [TActionId in PocSemanticActionIdV1]: RuntimeSchemaV1<
    PocSemanticInvocationOptionsByActionV1[TActionId]
  >;
};

export const pocSemanticInvocationOptionsSchemaByActionV1 = Object.freeze({
  "action.choose_life_policy": chooseLifePolicyOptionsSchemaV1,
  "action.purchase": purchaseOptionsSchemaV1,
  "action.prepare_food": noSemanticOptionsSchemaV1,
  "action.rest": noSemanticOptionsSchemaV1,
  "action.service_plan": tavernPlanOptionsSchemaV1,
  "action.advance_phase": noSemanticOptionsSchemaV1,
  "action.pay_levy": noSemanticOptionsSchemaV1,
  "action.facility_window": facilityOptionsSchemaV1,
  "action.repair_sign_with_heroine": noSemanticOptionsSchemaV1,
  "action.old_trade_road": worldActionOptionsSchemaV1,
  "action.apologize_to_heroine": noSemanticOptionsSchemaV1,
  "action.run_start": noSemanticOptionsSchemaV1,
  "action.tavern_opening_start": noSemanticOptionsSchemaV1,
  "action.tavern_opening_continue": noSemanticOptionsSchemaV1,
  "action.tavern_opening_finalize": noSemanticOptionsSchemaV1,
  "action.world_action_complete": noSemanticOptionsSchemaV1,
  "action.narrative_advance": noSemanticOptionsSchemaV1,
  "action.narrative_choose": narrativeChoiceOptionsSchemaV1,
} satisfies PocSemanticInvocationOptionsSchemaMapV1);

const semanticActionIdsV1 = Object.freeze([
  ...actionIdsV1,
  ...pocSemanticWorkflowActionIdsV1,
] as readonly PocSemanticActionIdV1[]);
const semanticActionIdSetV1 = new Set<string>(semanticActionIdsV1);
const authoredSemanticActionIdSetV1 = new Set<string>(actionIdsV1);

function isPocSemanticActionIdV1(value: unknown): value is PocSemanticActionIdV1 {
  return typeof value === "string" && semanticActionIdSetV1.has(value);
}

export const pocSemanticInvocationSchemaV1: RuntimeSchemaV1<PocSemanticInvocationV1> =
  Object.freeze({
    parse(value: unknown): PocSemanticInvocationV1 {
      let invocation: ExactDataObjectV1;
      try {
        invocation = requireExactDataObjectV1(
          value,
          ["kind", "actionId", "options"],
          "PoC Semantic invocation",
        );
      } catch (error) {
        throw new PocSemanticInvocationErrorV1(
          "semantic.invocation_invalid",
          "invalid PoC Semantic invocation",
          { cause: error },
        );
      }
      if (invocation.kind !== "invoke") {
        throw new PocSemanticInvocationErrorV1(
          "semantic.invocation_invalid",
          "invalid PoC Semantic invocation kind",
        );
      }
      if (!isPocSemanticActionIdV1(invocation.actionId)) {
        throw new PocSemanticInvocationErrorV1(
          "semantic.action_unknown",
          "unknown PoC Semantic action",
        );
      }
      const actionId = invocation.actionId;
      try {
        const options = pocSemanticInvocationOptionsSchemaByActionV1[actionId].parse(
          invocation.options,
        );
        return Object.freeze({ kind: "invoke", actionId, options }) as PocSemanticInvocationV1;
      } catch (error) {
        throw new PocSemanticInvocationErrorV1(
          "semantic.options_invalid",
          `invalid options for PoC Semantic action ${actionId}`,
          { cause: error },
        );
      }
    },
  });

export function parsePocSemanticInvocationV1(value: unknown): PocSemanticInvocationV1 {
  return pocSemanticInvocationSchemaV1.parse(value);
}

export function commandForPocSemanticInvocationV1(
  invocationValue: DeepReadonly<PocSemanticInvocationV1>,
): PocGameCommandV1 {
  const invocation = parsePocSemanticInvocationV1(invocationValue);
  switch (invocation.actionId) {
    case "action.choose_life_policy":
      return Object.freeze({ kind: "policy.choose", policyId: invocation.options.policyId });
    case "action.purchase":
      return Object.freeze({ kind: "inventory.buy", lines: invocation.options.lines });
    case "action.prepare_food":
      return Object.freeze({ kind: "actor.prepare_food" });
    case "action.rest":
      return Object.freeze({ kind: "actor.rest" });
    case "action.service_plan":
      return Object.freeze({ kind: "tavern.plan.set", plan: invocation.options.plan });
    case "action.advance_phase":
      return Object.freeze({ kind: "calendar.advance_phase" });
    case "action.pay_levy":
      return Object.freeze({ kind: "levy.pay" });
    case "action.facility_window":
      return Object.freeze({
        kind: "facility.choose",
        opportunityId: actionIdsV1[7],
        choice: invocation.options.choice,
      });
    case "action.repair_sign_with_heroine":
      return Object.freeze({ kind: "story.action.start", actionId: actionIdsV1[8] });
    case "action.old_trade_road":
      return Object.freeze({
        kind: "world.action.begin",
        actionId: actionIdsV1[9],
        optionId: invocation.options.optionId,
      });
    case "action.apologize_to_heroine":
      return Object.freeze({ kind: "story.action.start", actionId: actionIdsV1[10] });
    case "action.run_start":
      return Object.freeze({ kind: "run.start" });
    case "action.tavern_opening_start":
      return Object.freeze({ kind: "tavern.opening.start" });
    case "action.tavern_opening_continue":
      return Object.freeze({ kind: "tavern.opening.continue" });
    case "action.tavern_opening_finalize":
      return Object.freeze({ kind: "tavern.opening.finalize" });
    case "action.world_action_complete":
      return Object.freeze({ kind: "world.action.complete" });
    case "action.narrative_advance":
      return Object.freeze({ kind: "narrative.advance" });
    case "action.narrative_choose":
      return Object.freeze({
        kind: "narrative.choose",
        sceneId: invocation.options.sceneId,
        nodeId: invocation.options.nodeId,
        choiceId: invocation.options.choiceId,
      });
  }
  const unsupported: never = invocation;
  throw new TypeError(`unsupported PoC Semantic invocation ${String(unsupported)}`);
}

function freezeReasonsV1(
  reasons: readonly DeepReadonly<PocRejectionReasonV1>[],
): readonly DeepReadonly<PocRejectionReasonV1>[] {
  return Object.freeze(reasons.map((reason) => pocRejectionReasonSchemaV1.parse(reason)));
}

function reasonsForActionV1(
  queries: PocGameQueriesV1,
  action: DeepReadonly<ActionViewV1>,
): readonly DeepReadonly<PocRejectionReasonV1>[] {
  return action.available
    ? Object.freeze([])
    : freezeReasonsV1(queries.explainAvailability(action.actionId).reasons);
}

type PocDirectSemanticActionIdV1 = {
  readonly [
    TActionId in PocSemanticActionIdV1
  ]: PocSemanticDeliveryKindByActionV1[TActionId] extends "direct" ? TActionId : never;
}[PocSemanticActionIdV1];

type PocChoiceSemanticActionIdV1 = {
  readonly [
    TActionId in PocSemanticActionIdV1
  ]: PocSemanticDeliveryKindByActionV1[TActionId] extends "choices" ? TActionId : never;
}[PocSemanticActionIdV1];

type PocSemanticDescriptorForV1<TActionId extends PocSemanticActionIdV1> = Extract<
  PocSemanticActionDescriptorV1,
  { readonly actionId: TActionId }
>;

function directDescriptorV1<TActionId extends PocDirectSemanticActionIdV1>(input: {
  readonly actionId: TActionId;
  readonly textId: TextId;
  readonly enabled: boolean;
  readonly reasons: readonly DeepReadonly<PocRejectionReasonV1>[];
  readonly confirmation: DeepReadonly<PocSemanticConfirmationV1> | null;
  readonly invocation: DeepReadonly<
    Extract<PocSemanticInvocationV1, { readonly actionId: TActionId }>
  >;
}): PocSemanticDescriptorForV1<TActionId> {
  return Object.freeze({
    actionId: input.actionId,
    textId: input.textId,
    enabled: input.enabled,
    reasons: input.reasons,
    confirmation: input.confirmation,
    delivery: "direct",
    directInvocation: input.invocation,
    options: Object.freeze([]),
    form: null,
  }) as PocSemanticDescriptorForV1<TActionId>;
}

function choicesDescriptorV1<TActionId extends PocChoiceSemanticActionIdV1>(input: {
  readonly actionId: TActionId;
  readonly textId: TextId;
  readonly enabled: boolean;
  readonly reasons: readonly DeepReadonly<PocRejectionReasonV1>[];
  readonly confirmation: DeepReadonly<PocSemanticConfirmationV1> | null;
  readonly options: readonly DeepReadonly<
    PocSemanticActionOptionV1<Extract<PocSemanticInvocationV1, { readonly actionId: TActionId }>>
  >[];
}): PocSemanticDescriptorForV1<TActionId> {
  const first = input.options[0];
  if (first === undefined)
    throw new TypeError(`PoC Semantic action ${input.actionId} has no choices`);
  const options = Object.freeze(
    input.options.map((option) =>
      Object.freeze({
        optionId: option.optionId,
        textId: option.textId,
        invocation: option.invocation,
      }),
    ),
  );
  return Object.freeze({
    actionId: input.actionId,
    textId: input.textId,
    enabled: input.enabled,
    reasons: input.reasons,
    confirmation: input.confirmation,
    delivery: "choices",
    directInvocation: null,
    options,
    form: null,
  }) as PocSemanticDescriptorForV1<TActionId>;
}

function formDescriptorV1<TActionId extends keyof PocSemanticFormByActionV1>(input: {
  readonly actionId: TActionId;
  readonly textId: TextId;
  readonly enabled: boolean;
  readonly reasons: readonly DeepReadonly<PocRejectionReasonV1>[];
  readonly confirmation: DeepReadonly<PocSemanticConfirmationV1> | null;
  readonly form: DeepReadonly<PocSemanticFormByActionV1[TActionId]>;
}): PocSemanticDescriptorForV1<TActionId> {
  return Object.freeze({
    actionId: input.actionId,
    textId: input.textId,
    enabled: input.enabled,
    reasons: input.reasons,
    confirmation: input.confirmation,
    delivery: "form",
    directInvocation: null,
    options: Object.freeze([]),
    form: input.form,
  }) as PocSemanticDescriptorForV1<TActionId>;
}

function invocationV1<TActionId extends PocSemanticActionIdV1>(
  actionId: TActionId,
  options: PocSemanticInvocationOptionsByActionV1[TActionId],
): Extract<PocSemanticInvocationV1, { readonly actionId: TActionId }> {
  return parsePocSemanticInvocationV1({ kind: "invoke", actionId, options }) as Extract<
    PocSemanticInvocationV1,
    { readonly actionId: TActionId }
  >;
}

function previewAvailabilityV1(preview: CommandPreviewV1): {
  readonly enabled: boolean;
  readonly reasons: readonly DeepReadonly<PocRejectionReasonV1>[];
  readonly confirmation: DeepReadonly<PocSemanticConfirmationV1> | null;
} {
  return preview.allowed
    ? Object.freeze({
        enabled: true,
        reasons: Object.freeze([]),
        confirmation: preview.confirmation,
      })
    : Object.freeze({
        enabled: false,
        reasons: freezeReasonsV1(preview.reasons),
        confirmation: null,
      });
}

export function createPocSemanticActionCatalogV1(
  queries: PocGameQueriesV1,
): readonly PocSemanticActionDescriptorV1[] {
  const descriptors: PocSemanticActionDescriptorV1[] = [];
  const actionInput = queries.getActionInputCatalog();

  for (const action of queries.getAvailableActions()) {
    if (!authoredSemanticActionIdSetV1.has(action.actionId)) {
      throw new TypeError(`unsupported authored PoC Action ${action.actionId}`);
    }
    const actionId = action.actionId as PocAuthoredSemanticActionIdV1;
    const reasons = reasonsForActionV1(queries, action);
    const common = {
      textId: action.labelTextId,
      enabled: action.available,
      reasons,
      confirmation: action.confirmation,
    } as const;
    switch (actionId) {
      case "action.choose_life_policy": {
        const selection = queries.getLifePolicySelection();
        if (selection === null) break;
        descriptors.push(
          choicesDescriptorV1({
            actionId,
            ...common,
            options: selection.options.map((option) => ({
              optionId: option.policyId,
              textId: option.nameTextId,
              invocation: invocationV1(actionId, { policyId: option.policyId }),
            })),
          }),
        );
        break;
      }
      case "action.purchase":
        descriptors.push(
          formDescriptorV1({
            actionId,
            ...common,
            form: Object.freeze({
              kind: "purchase",
              actionId,
              input: actionInput.purchase,
            }),
          }),
        );
        break;
      case "action.prepare_food":
      case "action.rest":
      case "action.advance_phase":
      case "action.pay_levy":
      case "action.repair_sign_with_heroine":
      case "action.apologize_to_heroine": {
        const invocation = invocationV1(actionId, {});
        const preview = previewPocSemanticInvocationV1(queries, invocation);
        descriptors.push(
          directDescriptorV1({
            actionId: actionId,
            textId: action.labelTextId,
            ...previewAvailabilityV1(preview),
            invocation,
          }),
        );
        break;
      }
      case "action.service_plan":
        descriptors.push(
          formDescriptorV1({
            actionId,
            ...common,
            form: Object.freeze({
              kind: "tavern_plan",
              actionId,
              input: actionInput.tavernPlan,
            }),
          }),
        );
        break;
      case "action.facility_window": {
        const options = actionInput.facility.options
          .filter(({ opportunityId }) => opportunityId === actionId)
          .map((option) => ({
            optionId: option.choice.kind === "build" ? option.choice.facilityId : "skip",
            textId: option.labelTextId,
            invocation: invocationV1(actionId, { choice: option.choice }),
          }));
        descriptors.push(choicesDescriptorV1({ actionId, ...common, options }));
        break;
      }
      case "action.old_trade_road": {
        const options = actionInput.worldAction.options
          .filter(({ actionId: optionActionId }) => optionActionId === actionId)
          .map((option) => ({
            optionId: option.optionId,
            textId: option.labelTextId,
            invocation: invocationV1(actionId, { optionId: option.optionId }),
          }));
        descriptors.push(choicesDescriptorV1({ actionId, ...common, options }));
        break;
      }
      default: {
        const unsupported: never = actionId;
        throw new TypeError(`unsupported authored PoC Action ${String(unsupported)}`);
      }
    }
  }

  const runStart = queries.getRunStartControl();
  if (runStart !== null) {
    descriptors.push(
      directDescriptorV1({
        actionId: "action.run_start",
        textId: pocTextIdsV1.actionRunStartLabel,
        ...previewAvailabilityV1(runStart.preview),
        invocation: invocationV1("action.run_start", {}),
      }),
    );
  }

  const opening = queries.getTavernOpeningControl();
  if (opening !== null) {
    const actionId =
      opening.kind === "start"
        ? "action.tavern_opening_start"
        : opening.kind === "continue"
          ? "action.tavern_opening_continue"
          : "action.tavern_opening_finalize";
    const textId =
      opening.kind === "start"
        ? pocTextIdsV1.actionTavernOpeningStartLabel
        : opening.kind === "continue"
          ? pocTextIdsV1.actionTavernOpeningContinueLabel
          : pocTextIdsV1.actionTavernOpeningFinalizeLabel;
    descriptors.push(
      directDescriptorV1({
        actionId,
        textId,
        ...previewAvailabilityV1(opening.preview),
        invocation: invocationV1(actionId, {}),
      }),
    );
  }

  const worldCompleteCommand = Object.freeze({ kind: "world.action.complete" as const });
  const worldCompletePreview = queries.previewCommand(worldCompleteCommand);
  if (worldCompletePreview.allowed) {
    descriptors.push(
      directDescriptorV1({
        actionId: "action.world_action_complete",
        textId: pocTextIdsV1.actionWorldActionCompleteLabel,
        ...previewAvailabilityV1(worldCompletePreview),
        invocation: invocationV1("action.world_action_complete", {}),
      }),
    );
  }

  const narrative = queries.getNarrativeProjection();
  if (narrative !== null) {
    const cursor = narrative.cursor;
    if (cursor === null) throw new TypeError("active PoC Narrative projection has no cursor");
    if (narrative.choices.length > 0) {
      const options = narrative.choices
        .filter(({ enabled }) => enabled)
        .map((choice) => ({
          optionId: choice.choiceId,
          textId: choice.textId,
          invocation: invocationV1("action.narrative_choose", {
            sceneId: cursor.sceneId,
            nodeId: cursor.nodeId,
            choiceId: choice.choiceId,
          }),
        }));
      if (options.length > 0) {
        descriptors.push(
          choicesDescriptorV1({
            actionId: "action.narrative_choose",
            textId: pocTextIdsV1.actionNarrativeChooseLabel,
            enabled: true,
            reasons: Object.freeze([]),
            confirmation: null,
            options,
          }),
        );
      }
    } else {
      const preview = queries.previewCommand(Object.freeze({ kind: "narrative.advance" as const }));
      descriptors.push(
        directDescriptorV1({
          actionId: "action.narrative_advance",
          textId: pocTextIdsV1.actionNarrativeAdvanceLabel,
          ...previewAvailabilityV1(preview),
          invocation: invocationV1("action.narrative_advance", {}),
        }),
      );
    }
  }

  return Object.freeze(descriptors);
}

export function previewPocSemanticInvocationV1(
  queries: PocGameQueriesV1,
  invocationValue: DeepReadonly<PocSemanticInvocationV1>,
): PocSemanticPreviewV1 {
  return queries.previewCommand(commandForPocSemanticInvocationV1(invocationValue));
}

type PocSessionDispatchResultV1 = Awaited<
  ReturnType<GameSessionV1<PocGameSimulationTypesV1>["dispatch"]>
>;

export function projectPocSemanticActionResultV1(
  result: PocSessionDispatchResultV1,
): PocSemanticActionResultV1 {
  if (result.kind === "not_executed") {
    return Object.freeze({ kind: "not_executed", code: result.code });
  }
  switch (result.execution.kind) {
    case "committed":
      return Object.freeze({ kind: "committed" });
    case "rejected":
      return Object.freeze({
        kind: "rejected",
        reasons: freezeReasonsV1(result.execution.reasons),
      });
    case "faulted":
      return Object.freeze({ kind: "faulted", code: "gameplay_fault" });
  }
  const unsupported: never = result.execution;
  throw new TypeError(`unsupported PoC Session result ${String(unsupported)}`);
}
