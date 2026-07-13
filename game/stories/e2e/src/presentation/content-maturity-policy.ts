// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  combineContentMaturityFlagsV1,
  emptyContentMaturityFlagsV1,
  parseContentMaturityFlagBitV1,
  parseContentMaturityFlagId,
  parseContentMaturityPolicyV1,
  parseContentPreferencePresetId,
} from "@sillymaker/base";

export const e2eAlphaFlagV1 = parseContentMaturityFlagBitV1(1);
export const e2eBetaFlagV1 = parseContentMaturityFlagBitV1(2);
export const e2eBothFlagsV1 = combineContentMaturityFlagsV1(e2eAlphaFlagV1, e2eBetaFlagV1);

export const e2eBaseContentPresetIdV1 = parseContentPreferencePresetId("content_preset.e2e.base");
export const e2eStreamSafeContentPresetIdV1 = parseContentPreferencePresetId(
  "content_preset.e2e.stream_safe",
);
export const e2eAllContentPresetIdV1 = parseContentPreferencePresetId("content_preset.e2e.all");

export const e2eContentMaturityPolicyV1 = parseContentMaturityPolicyV1({
  policyRevision: 1,
  flags: [
    {
      id: parseContentMaturityFlagId("content_flag.e2e.alpha"),
      flag: e2eAlphaFlagV1,
      nameTextId: "text.e2e.content_flag.alpha.name",
      descriptionTextId: "text.e2e.content_flag.alpha.description",
    },
    {
      id: parseContentMaturityFlagId("content_flag.e2e.beta"),
      flag: e2eBetaFlagV1,
      nameTextId: "text.e2e.content_flag.beta.name",
      descriptionTextId: "text.e2e.content_flag.beta.description",
    },
  ],
  presets: [
    {
      presetId: e2eBaseContentPresetIdV1,
      allowedFlags: emptyContentMaturityFlagsV1,
      nameTextId: "text.e2e.content_preset.base.name",
      descriptionTextId: "text.e2e.content_preset.base.description",
    },
    {
      presetId: e2eStreamSafeContentPresetIdV1,
      allowedFlags: e2eBetaFlagV1,
      nameTextId: "text.e2e.content_preset.stream_safe.name",
      descriptionTextId: "text.e2e.content_preset.stream_safe.description",
    },
    {
      presetId: e2eAllContentPresetIdV1,
      allowedFlags: e2eBothFlagsV1,
      nameTextId: "text.e2e.content_preset.all.name",
      descriptionTextId: "text.e2e.content_preset.all.description",
    },
  ],
  defaultAllowedFlags: emptyContentMaturityFlagsV1,
});
