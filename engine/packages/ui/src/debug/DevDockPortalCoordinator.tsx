// SPDX-License-Identifier: MIT
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";

export type DevDockPortalSurfaceV1 = "narrative" | "overlay" | "system" | "fault_pause";

type DevDockPortalSelectionSurfaceV1 = DevDockPortalSurfaceV1 | "base";

interface DevDockPortalTargetRegistrationV1 {
  readonly surface: DevDockPortalSurfaceV1;
  readonly target: HTMLElement;
}

interface DevDockPortalTargetSelectionV1 {
  readonly target: HTMLElement | null;
  readonly surface: DevDockPortalSelectionSurfaceV1;
}

interface DevDockPortalContextValueV1 {
  register(surface: DevDockPortalSurfaceV1, target: HTMLElement): () => void;
  readonly selection: DevDockPortalTargetSelectionV1;
}

export interface DevDockPortalCoordinatorPropsV1 {
  readonly children: ReactNode;
  readonly baseTargetClassName?: string;
}

const DevDockPortalContextV1 = createContext<DevDockPortalContextValueV1 | null>(null);

const devDockPortalSurfacePriorityV1 = Object.freeze([
  "fault_pause",
  "system",
  "overlay",
  "narrative",
] as const satisfies readonly DevDockPortalSurfaceV1[]);

const missingDevDockPortalSelectionV1 = Object.freeze({
  target: null,
  surface: "base",
}) satisfies DevDockPortalTargetSelectionV1;

/** Lets an enclosing capture-phase dialog defer Escape to an open nested DevDock rail. */
export function isDevDockEscapeOwnerTargetV1(target: EventTarget | null): boolean {
  return (
    typeof Element !== "undefined" &&
    target instanceof Element &&
    target.closest('[data-devdock-escape-owner="true"]') !== null
  );
}

function selectDevDockPortalTargetV1(
  registrations: readonly DevDockPortalTargetRegistrationV1[],
  baseTarget: HTMLElement | null,
): DevDockPortalTargetSelectionV1 {
  for (const surface of devDockPortalSurfacePriorityV1) {
    const registration = registrations.findLast((candidate) => candidate.surface === surface);
    if (registration !== undefined) {
      return Object.freeze({ target: registration.target, surface });
    }
  }
  return Object.freeze({ target: baseTarget, surface: "base" });
}

/** Selects one semantic DevDock portal target independently of surface mount order. */
export function DevDockPortalCoordinatorV1(props: DevDockPortalCoordinatorPropsV1): ReactElement {
  const [baseTarget, setBaseTarget] = useState<HTMLDivElement | null>(null);
  const [registrations, setRegistrations] = useState<readonly DevDockPortalTargetRegistrationV1[]>(
    () => Object.freeze([]),
  );

  const register = useCallback(
    (surface: DevDockPortalSurfaceV1, target: HTMLElement): (() => void) => {
      const registration = Object.freeze({ surface, target });
      setRegistrations((current) => Object.freeze([...current, registration]));
      let registered = true;
      return () => {
        if (!registered) return;
        registered = false;
        setRegistrations((current) =>
          Object.freeze(current.filter((candidate) => candidate !== registration)),
        );
      };
    },
    [],
  );
  const selection = useMemo(
    () => selectDevDockPortalTargetV1(registrations, baseTarget),
    [baseTarget, registrations],
  );
  const contextValue = useMemo(
    () => Object.freeze({ register, selection }) satisfies DevDockPortalContextValueV1,
    [register, selection],
  );

  return (
    <DevDockPortalContextV1.Provider value={contextValue}>
      <div
        ref={setBaseTarget}
        className={props.baseTargetClassName}
        data-devdock-portal-target="base"
      />
      {props.children}
    </DevDockPortalContextV1.Provider>
  );
}

/** Registers a live blocking focus scope when a coordinator is present. */
export function useDevDockPortalTargetRegistrationV1(
  surface: DevDockPortalSurfaceV1,
  target: HTMLElement | null,
): void {
  const register = useContext(DevDockPortalContextV1)?.register;
  useLayoutEffect(() => {
    if (register === undefined || target === null) return undefined;
    return register(surface, target);
  }, [register, surface, target]);
}

/** Returns the highest-priority live target, or the coordinator's base target. */
export function useDevDockPortalTargetV1(): DevDockPortalTargetSelectionV1 {
  return useContext(DevDockPortalContextV1)?.selection ?? missingDevDockPortalSelectionV1;
}
