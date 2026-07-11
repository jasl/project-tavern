// SPDX-License-Identifier: MIT
import type { GameModuleBindingV1 } from "../contracts/module.js";
import {
  parseModuleId,
  parsePositiveSafeInteger,
  parseStateSlotId,
} from "../contracts/values.js";

export function deepFreezeAuthoringValueV1<T>(value: T): T {
  const seen = new WeakSet<object>();
  function freeze(current: unknown): void {
    if (
      (typeof current !== "object" && typeof current !== "function") ||
      current === null
    ) {
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

export function defineGameModule<TBinding extends GameModuleBindingV1>(
  binding: TBinding,
): TBinding {
  parseModuleId(binding.descriptor.id);
  parsePositiveSafeInteger(binding.descriptor.contractRevision);
  const slots = binding.descriptor.stateSlots.map(parseStateSlotId);
  const dependencies = binding.descriptor.dependencies.map(parseModuleId);
  if (new Set(slots).size !== slots.length) {
    throw new TypeError("duplicate State slot in Module");
  }
  if (new Set(dependencies).size !== dependencies.length) {
    throw new TypeError("duplicate Module dependency");
  }
  if (dependencies.includes(binding.descriptor.id)) {
    throw new TypeError("Module may not depend on itself");
  }

  if (binding.bindingKind === "stateless") {
    if (
      slots.length !== 0 ||
      binding.owner !== null ||
      binding.ownerOperationSchema !== null ||
      binding.ownerProposalSchema !== null ||
      Object.hasOwn(binding, "stateSchema") ||
      Object.hasOwn(binding, "createInitialState") ||
      Object.hasOwn(binding, "createReadPort") ||
      Object.hasOwn(binding, "localInvariants")
    ) {
      throw new TypeError("stateless Module must not own State");
    }
  } else if (
    slots.length === 0 ||
    binding.owner === null ||
    binding.stateSchema === null ||
    binding.ownerOperationSchema === null ||
    binding.ownerProposalSchema === null ||
    typeof binding.createInitialState !== "function" ||
    typeof binding.createReadPort !== "function"
  ) {
    throw new TypeError("stateful Module must declare complete ownership");
  }

  return deepFreezeAuthoringValueV1(binding);
}
