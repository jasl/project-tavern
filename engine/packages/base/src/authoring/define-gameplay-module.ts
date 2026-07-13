// SPDX-License-Identifier: MIT
import type {
  GameSimulationTypeMapV1,
  ModuleOwnerProposalEnvelopeV1,
  StatefulGameplayModuleBindingV1,
  StatelessGameplayModuleBindingV1,
} from "../contracts/gameplay-module.js";
import { parseModuleId, parsePositiveSafeInteger, parseStateSlotId } from "../contracts/values.js";

export function deepFreezeAuthoringValueV1<T>(value: T): T {
  const seen = new WeakSet<object>();
  function freeze(current: unknown): void {
    if ((typeof current !== "object" && typeof current !== "function") || current === null) {
      return;
    }
    if (seen.has(current)) return;
    seen.add(current);
    for (const key of Reflect.ownKeys(current)) {
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (descriptor?.get !== undefined || descriptor?.set !== undefined) {
        throw new TypeError("authoring accessors are forbidden");
      }
      freeze(descriptor?.value);
    }
    Object.freeze(current);
  }
  freeze(value);
  return value;
}

interface DefineGameplayModuleV1<TTypes extends GameSimulationTypeMapV1> {
  <
    TStateSlice,
    TModuleCommand,
    TModuleQuery,
    TModuleQueryResult,
    TOwnerOperation,
    TOwnerProposal extends ModuleOwnerProposalEnvelopeV1<unknown, TTypes["fact"]>,
    TReadPort,
    TDependencyPorts,
  >(
    binding: StatefulGameplayModuleBindingV1<
      TTypes,
      TStateSlice,
      TModuleCommand,
      TModuleQuery,
      TModuleQueryResult,
      TOwnerOperation,
      TOwnerProposal,
      TReadPort,
      TDependencyPorts
    >,
  ): StatefulGameplayModuleBindingV1<
    TTypes,
    TStateSlice,
    TModuleCommand,
    TModuleQuery,
    TModuleQueryResult,
    TOwnerOperation,
    TOwnerProposal,
    TReadPort,
    TDependencyPorts
  >;
  <TModuleCommand, TModuleQuery, TModuleQueryResult, TCapabilities>(
    binding: StatelessGameplayModuleBindingV1<
      TTypes,
      TModuleCommand,
      TModuleQuery,
      TModuleQueryResult,
      TCapabilities
    >,
  ): StatelessGameplayModuleBindingV1<
    TTypes,
    TModuleCommand,
    TModuleQuery,
    TModuleQueryResult,
    TCapabilities
  >;
}

function requireRecord(value: unknown, label: string): Record<PropertyKey, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  return value as Record<PropertyKey, unknown>;
}

function requireArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`invalid ${label}`);
  return value;
}

function requireFunction(
  value: unknown,
  label: string,
): asserts value is (...args: unknown[]) => unknown {
  if (typeof value !== "function") throw new TypeError(`invalid ${label}`);
}

function requireNullableSchema(value: unknown, label: string): void {
  if (value !== null) requireFunction(requireRecord(value, label).parse, `${label} parse`);
}

function validateGameplayModuleV1(bindingValue: unknown): unknown {
  const binding = requireRecord(bindingValue, "GameplayModule");
  deepFreezeAuthoringValueV1(bindingValue);
  const descriptor = requireRecord(binding.descriptor, "GameplayModule descriptor");
  const id = parseModuleId(descriptor.id);
  parsePositiveSafeInteger(descriptor.contractRevision);
  const slots = requireArray(descriptor.stateSlots, "GameplayModule stateSlots").map(
    parseStateSlotId,
  );
  const dependencies = requireArray(descriptor.dependencies, "GameplayModule dependencies").map(
    parseModuleId,
  );
  if (new Set(slots).size !== slots.length) {
    throw new TypeError("duplicate State slot in GameplayModule");
  }
  if (new Set(dependencies).size !== dependencies.length) {
    throw new TypeError("duplicate GameplayModule dependency");
  }
  if (dependencies.includes(id)) {
    throw new TypeError("GameplayModule may not depend on itself");
  }
  requireNullableSchema(binding.commandSchema, "GameplayModule command Schema");
  requireNullableSchema(binding.querySchema, "GameplayModule query Schema");
  requireNullableSchema(binding.queryResultSchema, "GameplayModule query result Schema");

  if (binding.bindingKind === "stateless") {
    if (
      slots.length !== 0 ||
      binding.owner !== null ||
      binding.ownerOperationSchema !== null ||
      binding.ownerProposalSchema !== null ||
      !Object.hasOwn(binding, "capabilities") ||
      Object.hasOwn(binding, "services") ||
      Object.hasOwn(binding, "stateSchema") ||
      Object.hasOwn(binding, "createInitialState") ||
      Object.hasOwn(binding, "createReadPort") ||
      Object.hasOwn(binding, "localInvariants") ||
      Object.hasOwn(binding, "queries")
    ) {
      throw new TypeError("stateless GameplayModule must expose capabilities without State");
    }
    const capabilities = requireRecord(binding.capabilities, "GameplayModule capabilities");
    for (const [name, capability] of Object.entries(capabilities)) {
      if (!/^(?:compile|evaluate|project|resolve|validate)[A-Z]/u.test(name)) {
        throw new TypeError(`invalid stateless GameplayModule capability name ${name}`);
      }
      requireFunction(capability, `GameplayModule capability ${name}`);
    }
  } else if (binding.bindingKind === "stateful") {
    const owner = requireRecord(binding.owner, "GameplayModule owner");
    if (
      slots.length === 0 ||
      binding.stateSchema === null ||
      binding.ownerOperationSchema === null ||
      binding.ownerProposalSchema === null ||
      !Array.isArray(binding.localInvariants) ||
      typeof owner.propose !== "function" ||
      typeof owner.apply !== "function" ||
      typeof binding.createInitialState !== "function" ||
      typeof binding.createReadPort !== "function"
    ) {
      throw new TypeError("stateful GameplayModule must declare complete ownership");
    }
    requireFunction(
      requireRecord(binding.stateSchema, "GameplayModule State Schema").parse,
      "GameplayModule State Schema parse",
    );
    requireFunction(
      requireRecord(binding.ownerOperationSchema, "GameplayModule owner operation Schema").parse,
      "GameplayModule owner operation Schema parse",
    );
    requireFunction(
      requireRecord(binding.ownerProposalSchema, "GameplayModule owner proposal Schema").parse,
      "GameplayModule owner proposal Schema parse",
    );
    for (const invariant of binding.localInvariants) {
      requireFunction(
        requireRecord(invariant, "GameplayModule local invariant").check,
        "GameplayModule local invariant check",
      );
    }
    if (binding.queries !== null) {
      requireFunction(
        requireRecord(binding.queries, "GameplayModule queries").execute,
        "GameplayModule queries execute",
      );
    }
  } else {
    throw new TypeError("invalid GameplayModule bindingKind");
  }

  return bindingValue;
}

export function defineGameplayModule<
  TTypes extends GameSimulationTypeMapV1,
>(): DefineGameplayModuleV1<TTypes> {
  return validateGameplayModuleV1 as DefineGameplayModuleV1<TTypes>;
}
