// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { defineStoryToolingEntry } from "@sillymaker/base";

import { pocStoryIdentityV1 } from "../content/identity.js";
import {
  pocFixtureIdsV1,
  pocStoryToolingFixtureByIdV1,
  pocStoryToolingFixturesV1,
} from "./fixtures.js";
import { pocToolingNotesV1 } from "./notes.js";

export { pocDebugCommandFormAdapterV1 } from "./debug-command-form-adapter.js";
export { pocFixtureIdsV1, pocStoryToolingFixtureByIdV1, pocStoryToolingFixturesV1 };
export { pocToolingNotesV1 };

export const pocStoryToolingEntryV1 = defineStoryToolingEntry({
  contractRevision: 1 as const,
  storyIdentity: pocStoryIdentityV1,
  defineToolingSupport() {
    return Object.freeze({
      fixtures: pocStoryToolingFixturesV1,
      notes: pocToolingNotesV1,
    });
  },
});
