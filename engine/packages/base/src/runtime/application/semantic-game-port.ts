// SPDX-License-Identifier: MIT
import type {
  SemanticGamePortInputV1,
  SemanticGamePortV1,
  SemanticPublicationV1,
} from "../../contracts/application.js";
import type { DeepReadonly, NonNegativeSafeInteger } from "../../contracts/values.js";
import { parseNonNegativeSafeInteger } from "../../contracts/values.js";

type PublicationFor<TGameView, TNarrativeView, TActionDescriptor, TStatus> = DeepReadonly<
  SemanticPublicationV1<TGameView, TNarrativeView, TActionDescriptor, TStatus>
>;

interface IdleWaiterV1<TPublication> {
  readonly afterRevision: NonNegativeSafeInteger | undefined;
  resolve(publication: TPublication): void;
}

const maxPendingIdleWaitersV1 = 256;

function isThenable(value: unknown): boolean {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) {
    return false;
  }
  let current: object | null = value;
  while (current !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(current, "then");
    if (descriptor !== undefined) {
      return (
        descriptor.get !== undefined ||
        descriptor.set !== undefined ||
        typeof descriptor.value === "function"
      );
    }
    current = Object.getPrototypeOf(current);
  }
  return false;
}

function requireSynchronousResult<T>(value: T, label: string): T {
  if (isThenable(value)) throw new TypeError(`${label} returned thenable`);
  return value;
}

function deepFreezeSemanticValueV1<T>(value: T): DeepReadonly<T> {
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
        throw new TypeError("Semantic publication accessors are forbidden");
      }
      freeze(descriptor?.value);
    }
    Object.freeze(current);
  }
  freeze(value);
  return value as DeepReadonly<T>;
}

function isBusyStatus(status: unknown): boolean {
  return status === "busy";
}

export function createSemanticGamePortV1<
  TState,
  TStatus,
  TQueries,
  TGameView,
  TNarrativeView,
  TActionDescriptor,
  TInvocation,
  TPreview,
  TResult,
>(
  input: SemanticGamePortInputV1<
    TState,
    TStatus,
    TQueries,
    TGameView,
    TNarrativeView,
    TActionDescriptor,
    TInvocation,
    TPreview,
    TResult
  >,
): SemanticGamePortV1<
  TGameView,
  TNarrativeView,
  TActionDescriptor,
  TInvocation,
  TPreview,
  TResult,
  TStatus
> {
  type Publication = PublicationFor<TGameView, TNarrativeView, TActionDescriptor, TStatus>;

  const listeners = new Set<() => void>();
  const idleWaiters = new Set<IdleWaiterV1<Publication>>();
  let authoritativeToken = input.source.getAuthoritativeRevisionToken();

  const projectCurrentState = (): {
    readonly game: DeepReadonly<TGameView>;
    readonly narrative: DeepReadonly<TNarrativeView>;
    readonly actions: readonly DeepReadonly<TActionDescriptor>[];
  } => {
    const queries = requireSynchronousResult(
      input.createQueries(input.source.getCurrentState()),
      "Semantic createQueries",
    );
    const game = deepFreezeSemanticValueV1(
      requireSynchronousResult(input.projectGameView(queries), "Semantic projectGameView"),
    );
    const narrative = deepFreezeSemanticValueV1(
      requireSynchronousResult(
        input.projectNarrativeView(queries),
        "Semantic projectNarrativeView",
      ),
    );
    const actionValues = requireSynchronousResult(input.actions(queries), "Semantic actions");
    if (!Array.isArray(actionValues)) throw new TypeError("Semantic actions must return an array");
    const actions = deepFreezeSemanticValueV1([...actionValues]);
    return Object.freeze({ game, narrative, actions });
  };

  const createPublication = (
    revision: NonNegativeSafeInteger,
    status: DeepReadonly<TStatus>,
    game: DeepReadonly<TGameView>,
    narrative: DeepReadonly<TNarrativeView>,
    actions: readonly DeepReadonly<TActionDescriptor>[],
  ): Publication =>
    Object.freeze({
      revision,
      status: deepFreezeSemanticValueV1(status),
      game,
      narrative,
      actions,
    }) as Publication;

  const initialProjection = projectCurrentState();
  let publication = createPublication(
    parseNonNegativeSafeInteger(0),
    input.source.getStatus(),
    initialProjection.game,
    initialProjection.narrative,
    initialProjection.actions,
  );

  const reportSubscriberFailure = (error: unknown): void => {
    try {
      input.source.reportSubscriberFailure(error);
    } catch {
      // Failure reporting is diagnostic-only and cannot interrupt semantic publication.
    }
  };

  const waiterCanResolve = (waiter: IdleWaiterV1<Publication>): boolean =>
    !isBusyStatus(publication.status) &&
    (waiter.afterRevision === undefined || publication.revision > waiter.afterRevision);

  const notify = (): void => {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch (error) {
        reportSubscriberFailure(error);
      }
    }
    for (const waiter of [...idleWaiters]) {
      if (!waiterCanResolve(waiter)) continue;
      idleWaiters.delete(waiter);
      waiter.resolve(publication);
    }
  };

  input.source.subscribe(() => {
    const nextToken = input.source.getAuthoritativeRevisionToken();
    const nextStatus = input.source.getStatus();
    if (nextToken === authoritativeToken && Object.is(nextStatus, publication.status)) return;

    if (nextToken === authoritativeToken) {
      publication = createPublication(
        publication.revision,
        nextStatus,
        publication.game as DeepReadonly<TGameView>,
        publication.narrative as DeepReadonly<TNarrativeView>,
        publication.actions as readonly DeepReadonly<TActionDescriptor>[],
      );
    } else {
      const projection = projectCurrentState();
      const nextPublication = createPublication(
        parseNonNegativeSafeInteger(publication.revision + 1),
        nextStatus,
        projection.game,
        projection.narrative,
        projection.actions,
      );
      authoritativeToken = nextToken;
      publication = nextPublication;
    }
    notify();
  });

  return Object.freeze({
    observe: () => publication,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    availableActions: () => publication.actions as readonly DeepReadonly<TActionDescriptor>[],
    preview(invocation: DeepReadonly<TInvocation>): Promise<TPreview> {
      try {
        return input.source.readStateAtQueueFront((state) => {
          const queries = requireSynchronousResult(
            input.createQueries(state),
            "Semantic createQueries",
          );
          return requireSynchronousResult(input.preview(queries, invocation), "Semantic preview");
        });
      } catch (error) {
        return Promise.reject(error);
      }
    },
    dispatch(invocation: DeepReadonly<TInvocation>): Promise<TResult> {
      try {
        return Promise.resolve(input.dispatch(invocation));
      } catch (error) {
        return Promise.reject(error);
      }
    },
    waitForIdle(afterRevision?: NonNegativeSafeInteger): Promise<Publication> {
      let parsedRevision: NonNegativeSafeInteger | undefined;
      try {
        parsedRevision =
          afterRevision === undefined ? undefined : parseNonNegativeSafeInteger(afterRevision);
      } catch (error) {
        return Promise.reject(error);
      }
      if (
        !isBusyStatus(publication.status) &&
        (parsedRevision === undefined || publication.revision > parsedRevision)
      ) {
        return Promise.resolve(publication);
      }
      if (idleWaiters.size >= maxPendingIdleWaitersV1) {
        return Promise.reject(new RangeError("Semantic idle waiter limit exceeded"));
      }
      return new Promise<Publication>((resolve) => {
        idleWaiters.add(Object.freeze({ afterRevision: parsedRevision, resolve }));
      });
    },
  });
}
