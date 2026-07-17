// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  setContentMaturityFlagV1,
  type ContentMaturityFlagBitV1,
  type ContentMaturityFlagsV1,
  type ContentPreferencePortV1,
  type ContentPreferenceV1,
  type DeepReadonly,
  type TextId,
} from "@sillymaker/base";
import { Button, type PresentationReadPortV1 } from "@sillymaker/ui";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import { e2eContentMaturityPolicyV1 } from "./content-maturity-policy.js";
import {
  e2eContentPreferenceRejectedTextIdV1,
  e2eContentPreferenceStorageFailedTextIdV1,
} from "./text-catalogs.js";

interface E2eSettingsSectionPropsV1<TAssetId, TAssetUsage, TLocaleId, TFallbackToken> {
  readonly contentPreference: ContentPreferencePortV1;
  readonly presentation: PresentationReadPortV1<
    TextId,
    TAssetId,
    TAssetUsage,
    TLocaleId,
    TFallbackToken
  >;
}

type ContentPreferenceFeedbackV1 = Readonly<{
  readonly kind: "rejected" | "failed";
  readonly observed: DeepReadonly<ContentPreferenceV1>;
}>;

function includesContentFlagV1(
  allowedFlags: ContentMaturityFlagsV1,
  flag: ContentMaturityFlagBitV1,
): boolean {
  return (allowedFlags & flag) === flag;
}

export function E2eSettingsSectionV1<TAssetId, TAssetUsage, TLocaleId, TFallbackToken>(
  props: E2eSettingsSectionPropsV1<TAssetId, TAssetUsage, TLocaleId, TFallbackToken>,
): ReactElement {
  const preference = useSyncExternalStore(
    props.contentPreference.subscribe,
    props.contentPreference.observe,
    props.contentPreference.observe,
  );
  const descriptionPrefix = useId();
  const mountedRef = useRef(true);
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<ContentPreferenceFeedbackV1 | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applyAllowedFlagsV1 = async (allowedFlags: ContentMaturityFlagsV1): Promise<void> => {
    if (pendingRef.current) return;
    const observed = preference;
    pendingRef.current = true;
    setPending(true);
    setFeedback(null);
    try {
      const result = await props.contentPreference.set(Object.freeze({ allowedFlags }));
      if (!mountedRef.current) return;
      switch (result.kind) {
        case "updated":
          setFeedback(null);
          break;
        case "rejected":
          setFeedback(Object.freeze({ kind: "rejected", observed }));
          break;
        case "failed":
          setFeedback(Object.freeze({ kind: "failed", observed }));
          break;
      }
    } catch {
      if (mountedRef.current) {
        setFeedback(Object.freeze({ kind: "failed", observed }));
      }
    } finally {
      pendingRef.current = false;
      if (mountedRef.current) setPending(false);
    }
  };

  const visibleFeedback = feedback?.observed === preference ? feedback : null;
  const feedbackTextId =
    visibleFeedback?.kind === "rejected"
      ? e2eContentPreferenceRejectedTextIdV1
      : visibleFeedback?.kind === "failed"
        ? e2eContentPreferenceStorageFailedTextIdV1
        : null;

  return (
    <div data-e2e-settings-section="content_preference" aria-busy={pending}>
      <ul>
        {e2eContentMaturityPolicyV1.flags.map((descriptor) => {
          const descriptionId = `${descriptionPrefix}-${descriptor.id}-description`;
          return (
            <li key={descriptor.id}>
              <label>
                <input
                  type="checkbox"
                  checked={includesContentFlagV1(preference.allowedFlags, descriptor.flag)}
                  disabled={pending}
                  aria-describedby={descriptionId}
                  data-content-flag-id={descriptor.id}
                  onChange={(event) => {
                    const allowedFlags = setContentMaturityFlagV1(
                      preference.allowedFlags,
                      descriptor.flag,
                      event.currentTarget.checked,
                    );
                    void applyAllowedFlagsV1(allowedFlags);
                  }}
                />
                <span>{props.presentation.text(descriptor.nameTextId).text}</span>
              </label>
              <p id={descriptionId}>{props.presentation.text(descriptor.descriptionTextId).text}</p>
            </li>
          );
        })}
      </ul>

      <ul>
        {e2eContentMaturityPolicyV1.presets.map((preset) => {
          const descriptionId = `${descriptionPrefix}-${preset.presetId}-description`;
          return (
            <li key={preset.presetId}>
              <Button
                disabled={pending}
                aria-describedby={descriptionId}
                aria-pressed={preference.allowedFlags === preset.allowedFlags}
                data-content-preset-id={preset.presetId}
                onClick={() => void applyAllowedFlagsV1(preset.allowedFlags)}
              >
                {props.presentation.text(preset.nameTextId).text}
              </Button>
              <p id={descriptionId}>{props.presentation.text(preset.descriptionTextId).text}</p>
            </li>
          );
        })}
      </ul>

      {feedbackTextId === null || visibleFeedback === null ? null : (
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-content-preference-result={visibleFeedback.kind}
        >
          {props.presentation.text(feedbackTextId).text}
        </p>
      )}
    </div>
  );
}
