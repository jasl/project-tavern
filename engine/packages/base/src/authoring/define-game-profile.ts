// SPDX-License-Identifier: MIT
import type { GameModuleBindingV1, GameProfileV1 } from "../contracts/module.js";
import { deepFreezeAuthoringValueV1 } from "./define-game-module.js";

function assertDependencyDag(modules: readonly GameModuleBindingV1[]): void {
  const moduleIds = new Set(modules.map((module) => module.descriptor.id));
  for (const module of modules) {
    for (const dependency of module.descriptor.dependencies) {
      if (!moduleIds.has(dependency)) {
        throw new TypeError(`missing dependency ${dependency} for ${module.descriptor.id}`);
      }
    }
  }

  const active = new Set<string>();
  const complete = new Set<string>();
  const byId = new Map(modules.map((module) => [module.descriptor.id as string, module]));
  function visit(id: string): void {
    if (active.has(id)) throw new TypeError(`dependency cycle at ${id}`);
    if (complete.has(id)) return;
    active.add(id);
    for (const dependency of byId.get(id)?.descriptor.dependencies ?? []) {
      visit(dependency);
    }
    active.delete(id);
    complete.add(id);
  }
  for (const id of [...byId.keys()].sort()) visit(id);
}

export function defineGameProfile<TProfile extends GameProfileV1>(profile: TProfile): TProfile {
  if (profile.contractRevision !== 1) {
    throw new TypeError("GameProfile contractRevision must be 1");
  }
  const ids = profile.modules.map((module) => module.descriptor.id);
  if (new Set(ids).size !== ids.length) {
    throw new TypeError("duplicate Module ID");
  }
  const slots = profile.modules.flatMap((module) => [...module.descriptor.stateSlots]);
  if (new Set(slots).size !== slots.length) {
    throw new TypeError("duplicate State slot");
  }
  for (const module of profile.modules) {
    if (module.bindingKind === "stateful" && module.descriptor.stateSlots.length === 0) {
      throw new TypeError("stateful Module has no State slot");
    }
    if (module.bindingKind === "stateless" && module.descriptor.stateSlots.length !== 0) {
      throw new TypeError("stateless Module owns a State slot");
    }
  }
  assertDependencyDag(profile.modules);
  return deepFreezeAuthoringValueV1(profile);
}
