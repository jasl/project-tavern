// SPDX-License-Identifier: MIT

export type HashRouteV1 = "main_menu" | "play";
export type CanonicalHashV1 = "#/" | "#/play";

export interface HashRouterPublicationV1 {
  readonly route: HashRouteV1;
  readonly hash: CanonicalHashV1;
}

export interface HashRouterLocationV1 {
  readonly hash: string;
  replace(nextHash: string): void;
}

export interface HashRouterEventTargetV1 {
  addEventListener(type: "hashchange", listener: () => void): void;
  removeEventListener(type: "hashchange", listener: () => void): void;
}

export interface CreateHashRouterOptionsV1 {
  readonly location: HashRouterLocationV1;
  readonly eventTarget?: HashRouterEventTargetV1;
}

export interface HashRouterV1 {
  observe(): Readonly<HashRouterPublicationV1>;
  subscribe(listener: () => void): () => void;
  dispose(): void;
}

const mainMenuPublicationV1 = Object.freeze({
  route: "main_menu",
  hash: "#/",
}) satisfies HashRouterPublicationV1;

const playPublicationV1 = Object.freeze({
  route: "play",
  hash: "#/play",
}) satisfies HashRouterPublicationV1;

function publicationForHashV1(hash: string): Readonly<HashRouterPublicationV1> | null {
  if (hash === mainMenuPublicationV1.hash) return mainMenuPublicationV1;
  if (hash === playPublicationV1.hash) return playPublicationV1;
  return null;
}

function defaultEventTargetV1(): HashRouterEventTargetV1 {
  if (typeof window === "undefined") {
    throw new TypeError("web.hash_router_event_target_unavailable");
  }
  return Object.freeze({
    addEventListener(type: "hashchange", listener: () => void): void {
      window.addEventListener(type, listener);
    },
    removeEventListener(type: "hashchange", listener: () => void): void {
      window.removeEventListener(type, listener);
    },
  });
}

export function createHashRouterV1(options: CreateHashRouterOptionsV1): HashRouterV1 {
  const eventTarget = options.eventTarget ?? defaultEventTargetV1();
  const listeners = new Set<() => void>();
  let disposed = false;

  const readLocationV1 = (): Readonly<HashRouterPublicationV1> => {
    const publication = publicationForHashV1(options.location.hash);
    if (publication !== null) return publication;
    options.location.replace(mainMenuPublicationV1.hash);
    return mainMenuPublicationV1;
  };

  let current = readLocationV1();
  const handleHashChangeV1 = (): void => {
    if (disposed) return;
    const next = readLocationV1();
    if (next === current) return;
    current = next;
    for (const listener of [...listeners]) listener();
  };

  eventTarget.addEventListener("hashchange", handleHashChangeV1);

  return Object.freeze({
    observe: () => current,
    subscribe(listener: () => void): () => void {
      if (disposed) return () => undefined;
      listeners.add(listener);
      let subscribed = true;
      return (): void => {
        if (!subscribed) return;
        subscribed = false;
        listeners.delete(listener);
      };
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      eventTarget.removeEventListener("hashchange", handleHashChangeV1);
      listeners.clear();
    },
  });
}
