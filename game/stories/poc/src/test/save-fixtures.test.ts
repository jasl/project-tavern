// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { canonicalJsonBytes, digestCanonical } from "@sillymaker/base";
import { describe, expect, it } from "vitest";

import {
  buildPocSaveFixtureMatrixV1,
  classifyPocSaveBytesV1,
  classifyPocSaveFixtureV1,
  inspectPocAutoRecoveryPairV1,
  pocSaveFixtureNamesV1,
  readPocSaveFixtureV1,
} from "../testing/save-fixture-builder.js";

interface MutableSaveAuditRecordV1 {
  stateDigest: string;
  snapshot: {
    state: {
      simulation: {
        actors: {
          player: { stamina: { current: number; maximum: number } };
        };
      };
      story: { facts: Array<{ factId: string }> };
    };
  };
}

function mutableSaveAuditRecordV1(value: unknown): MutableSaveAuditRecordV1 {
  return JSON.parse(
    new TextDecoder().decode(canonicalJsonBytes(value)),
  ) as MutableSaveAuditRecordV1;
}

function canonicalMutatedSaveBytesV1(record: MutableSaveAuditRecordV1): Uint8Array {
  record.stateDigest = digestCanonical("sillymaker:state:v1", record.snapshot);
  return canonicalJsonBytes(record);
}

describe("PoC provisional Save fixtures", () => {
  it("classifies exact, rejected, and inspect-only imports without flattening codes", async () => {
    await expect(classifyPocSaveFixtureV1("save.auto-opening.json")).resolves.toEqual({
      kind: "exact",
      mismatches: [],
    });
    await expect(classifyPocSaveFixtureV1("save.auto-current-corrupt.json")).resolves.toEqual({
      kind: "rejected",
      code: "digest.state_mismatch",
    });
    await expect(classifyPocSaveFixtureV1("save.future-format.json")).resolves.toEqual({
      kind: "rejected",
      code: "envelope.unsupported_revision",
    });
    await expect(classifyPocSaveFixtureV1("save.revision-mismatch.json")).resolves.toEqual({
      kind: "inspect_only",
      mismatches: [{ field: "story_revision", code: "identity.story_revision_mismatch" }],
    });
    await expect(classifyPocSaveFixtureV1("save.digest-mismatch.json")).resolves.toEqual({
      kind: "inspect_only",
      mismatches: [{ field: "simulation_digest", code: "identity.simulation_digest_mismatch" }],
    });
  });

  it("offers the valid previous slot only after the current Auto record is corrupt", async () => {
    await expect(inspectPocAutoRecoveryPairV1()).resolves.toEqual({
      current: { health: "invalid", code: "digest.state_mismatch" },
      previous: { health: "valid", disposition: "recovery_candidate" },
    });
  });

  it("rebuilds all eight canonical files from command-derived captures", async () => {
    const built = await buildPocSaveFixtureMatrixV1();
    expect([...built.files.keys()]).toEqual(pocSaveFixtureNamesV1);
    for (const name of pocSaveFixtureNamesV1) {
      const stored = await readPocSaveFixtureV1(name);
      const actual = built.records[name];
      expect(canonicalJsonBytes(actual)).toEqual(canonicalJsonBytes(stored));
      expect(built.files.get(name)).toEqual(canonicalJsonBytes(actual));
    }
  }, 30_000);

  it("changes only the declared field for each negative fixture", async () => {
    const built = await buildPocSaveFixtureMatrixV1();
    expect(built.negativeDiffs).toEqual({
      "save.auto-current-corrupt.json": ["stateDigest"],
      "save.future-format.json": ["formatRevision"],
      "save.revision-mismatch.json": ["provenance.story.revision"],
      "save.digest-mismatch.json": ["provenance.resolved.simulationDigest"],
    });
  }, 30_000);

  it("rejects schema-valid unknown references and local-invariant violations", async () => {
    const built = await buildPocSaveFixtureMatrixV1();
    const manual = built.records["save.manual-completed.json"];

    const unknownReference = mutableSaveAuditRecordV1(manual);
    const firstFact = unknownReference.snapshot.state.story.facts[0];
    if (firstFact === undefined) throw new TypeError("manual fixture has no Fact reference");
    firstFact.factId = "fact.fixture_audit_unknown";
    expect(classifyPocSaveBytesV1(canonicalMutatedSaveBytesV1(unknownReference))).toEqual({
      kind: "rejected",
      code: "reference.unknown_id",
    });

    const invariantViolation = mutableSaveAuditRecordV1(manual);
    const stamina = invariantViolation.snapshot.state.simulation.actors.player.stamina;
    stamina.current = stamina.maximum + 1;
    expect(classifyPocSaveBytesV1(canonicalMutatedSaveBytesV1(invariantViolation))).toEqual({
      kind: "rejected",
      code: "invariant.failed",
    });
  }, 30_000);
});
