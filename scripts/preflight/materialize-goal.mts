// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type {
  GoalMaterializationAdapterV1,
  GoalMaterializationAttestationV1,
} from "./verify-materialization.mjs";

const verifierModuleV1 = (await import(
  new URL("./verify-materialization.mts", import.meta.url).href
)) as typeof import("./verify-materialization.mjs");
const {
  createNodeGoalMaterializationAdapterV1,
  ExternalPreconditionError,
  fixedGoalPortsV1,
  goalMaterializationContractIdV1,
  goalMaterializationWorkflowSupportV1,
  parseGoalMaterializationAttestationV1,
  serializeGoalMaterializationAttestationV1,
} = verifierModuleV1;

export function goalMaterializationAttestationPathV1(root: string): string {
  return resolve(root, ".project-tavern/goal-materialization.json");
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
}

async function writeAttestationAtomicallyV1(
  root: string,
  adapter: GoalMaterializationAdapterV1,
  attestation: GoalMaterializationAttestationV1,
  validateCheckpoint: () => Promise<void>,
): Promise<void> {
  const target = goalMaterializationAttestationPathV1(root);
  const directory = dirname(target);
  const bytes = serializeGoalMaterializationAttestationV1(attestation);
  const candidate = `${target}.candidate-${adapter.uniqueSuffix()}`;
  try {
    await adapter.ensureDirectory(directory);
    const handle = await adapter.openExclusive(candidate);
    try {
      await handle.write(bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }
    const candidateBytes = await adapter.readFile(candidate);
    const candidateAttestation = parseGoalMaterializationAttestationV1(candidateBytes);
    if (
      !equalBytes(bytes, candidateBytes) ||
      candidateAttestation.materializationDigest !== attestation.materializationDigest ||
      candidateAttestation.materializationBaseCommit !== attestation.materializationBaseCommit
    ) {
      throw new TypeError("attestation candidate validation failed");
    }
    await validateCheckpoint();
    await adapter.rename(candidate, target);
    await adapter.syncDirectory(directory);
  } catch (error) {
    if (error instanceof ExternalPreconditionError) throw error;
    goalMaterializationWorkflowSupportV1.fail(
      "external_precondition.materialization_stale",
      `cannot publish materialization attestation: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    try {
      await adapter.remove(candidate);
    } catch {
      // Cleanup is best effort; candidate names are unique and never accepted as attestations.
    }
  }
}

export async function runMaterializeGoalV1(
  root: string,
  adapter: GoalMaterializationAdapterV1 = createNodeGoalMaterializationAdapterV1(root),
): Promise<GoalMaterializationAttestationV1> {
  const support = goalMaterializationWorkflowSupportV1;
  const repository = await support.inspectRepositoryPreconditionsV1(root, adapter);

  await support.requireSuccess(
    support.run(adapter, root, "pnpm", ["install", "--frozen-lockfile"], "allowed"),
    "external_precondition.package_materialization_failed",
    "online frozen package materialization failed",
  );
  await support.assertHostClosureV1(adapter, repository.contract);
  await support.requireSuccess(
    support.run(
      adapter,
      root,
      "pnpm",
      ["exec", "playwright", "install", "chromium", "webkit"],
      "allowed",
    ),
    "external_precondition.browser_materialization_failed",
    "Playwright browser materialization failed",
  );

  const browsers = await support.inspectBrowsersV1(adapter, repository.contract);
  const fontPaths = await support.inspectFontsV1(root, adapter);
  if (fontPaths.length < 4) {
    support.fail("external_precondition.visual_font_missing", "host font inspection is incomplete");
  }
  await support.assertDisposableVerificationV1(root, adapter, "build:player", browsers);

  const attestation: GoalMaterializationAttestationV1 = {
    arch: adapter.arch,
    branch: repository.branch,
    browsers: {
      chromium: { executableAvailable: true, revision: browsers.chromium.revision },
      webkit: { executableAvailable: true, revision: browsers.webkit.revision },
    },
    contractId: goalMaterializationContractIdV1,
    fixedPorts: fixedGoalPortsV1,
    materializationBaseCommit: repository.head,
    materializationDigest: repository.contract.materializationDigest,
    packageClosureDigest: repository.contract.packageClosureDigest,
    platform: adapter.platform,
    schemaRevision: 1,
    status: "complete",
  };
  await writeAttestationAtomicallyV1(root, adapter, attestation, async () => {
    await support.assertCleanWorktreeV1(root, adapter);
    const finalBranch = await support.readBranchV1(root, adapter);
    if (finalBranch !== repository.branch) {
      support.fail(
        "external_precondition.git_branch_invalid",
        "branch changed during materialization",
      );
    }
    const finalHead = await support.readHeadV1(root, adapter);
    if (finalHead !== repository.head) {
      support.fail(
        "external_precondition.phase_base_mismatch",
        "HEAD changed during materialization",
      );
    }
  });
  return attestation;
}

const isMain =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  if (process.argv.length !== 2) throw new TypeError("usage: materialize-goal.mts");
  const root = resolve(import.meta.dirname, "../..");
  const result = await runMaterializeGoalV1(root);
  console.log(`goal materialization complete ${result.materializationDigest}`);
}
