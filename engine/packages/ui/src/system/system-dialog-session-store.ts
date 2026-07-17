// SPDX-License-Identifier: MIT
import type { DeepReadonly } from "@sillymaker/base";

export interface SystemDialogSessionStateV1 {
  readonly settingsOpen: boolean;
}

export interface SystemDialogSessionStoreV1 {
  getSnapshot(): DeepReadonly<SystemDialogSessionStateV1>;
  subscribe(listener: () => void): () => void;
  openSettings(): void;
  closeSettings(): void;
}

function frozenSystemDialogSessionStateV1(
  settingsOpen: boolean,
): DeepReadonly<SystemDialogSessionStateV1> {
  return Object.freeze({ settingsOpen });
}

export function createSystemDialogSessionStoreV1(): SystemDialogSessionStoreV1 {
  let state = frozenSystemDialogSessionStateV1(false);
  const listeners = new Set<() => void>();

  const publish = (settingsOpen: boolean): void => {
    state = frozenSystemDialogSessionStateV1(settingsOpen);
    for (const listener of [...listeners]) listener();
  };

  return Object.freeze({
    getSnapshot(): DeepReadonly<SystemDialogSessionStateV1> {
      return state;
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        listeners.delete(listener);
      };
    },

    openSettings(): void {
      if (state.settingsOpen) return;
      publish(true);
    },

    closeSettings(): void {
      if (!state.settingsOpen) return;
      publish(false);
    },
  });
}
