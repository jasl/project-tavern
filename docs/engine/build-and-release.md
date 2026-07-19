# Build and local release

状态：当前 Project Tavern Web Player 的维护流程。

## Development server

```sh
pnpm dev
```

The development server uses the current Story application root and supports normal Vite development behavior. Development capability switches and HMR are not separate production build flavors; capability checks remain runtime behavior.

## Build the Player

```sh
pnpm build:poc
```

This creates the current static Project Tavern Player under `dist/poc`. A build is useful for local inspection, but it is not by itself a release handoff and does not publish anything.

Build identity is generated from the application and resolved Story inputs used by the build. Runtime digests and manifests are technical identity for compatibility, caching, diagnostics, and inspection; they are not proof of copyright ownership or asset approval.

## Prepare a local Artifact

```sh
pnpm release:poc
```

The release command builds the Player and prepares the local Artifact. A maintainable Artifact includes:

- the static Player files needed to start the game;
- a technical manifest describing the built files and identities;
- `LICENSE.md`, `NOTICE`, applicable license texts, `THIRD_PARTY_NOTICES.md`, and `TRADEMARKS.md`.

The legal files are a product packaging requirement for the composite bundle, not a Goal-era hash ritual. The manifest should describe actual output and reject missing/tampered product files without requiring one exact machine, exact package-manager patch, Git cleanliness, a Phase checkpoint, or a materialization attestation.

## Test the built Artifact

```sh
pnpm test:e2e:prebuilt
```

This serves and exercises the prepared Artifact rather than a source dev server. Use it after changes to routing, base paths, generated identity, asset loading, persistence bootstrap, bundle composition, or Artifact preparation.

For ordinary browser work against source, use:

```sh
pnpm test:e2e
```

## Release checklist

Before handing an Artifact to another person or machine:

1. run `pnpm check`;
2. run browser tests relevant to the change;
3. run `pnpm release:poc`;
4. run `pnpm test:e2e:prebuilt`;
5. inspect the generated manifest and legal-file presence;
6. record the source revision and any known gameplay/content limitations in the handoff note.

The current seven-day gameplay and its balance are provisional. Artifact preparation proves that the software can be packaged and started; it does not certify final game design, player experience, content approval, or commercial readiness.

## Remote distribution

No command in this document pushes, deploys, uploads, creates CI, or publishes a release. Hosting and remote distribution require a separately chosen target, credentials, retention policy, and rollback process. They should consume the already tested local Artifact rather than redefine game compatibility.

## Asset boundary

Only promoted runtime assets referenced by the Story and its technical asset manifest belong in the Player. Local `references/`, AIGC source archives, candidates, prompts, calibration reports, browser-test output, Saves, and diagnostics do not enter the Artifact. See [assets and references policy](../policies/assets-and-references.md).

## Troubleshooting

- If source tests pass but the prebuilt Player fails, inspect base paths, generated identity, manifest contents, and files copied during Artifact preparation.
- If persistence behaves differently between dev and prebuilt modes, verify that both applications use the same Story/state-contract identity and the intended IndexedDB database name.
- If a browser executable is missing, install the browser required by the current Playwright version; do not pin documentation to one cached revision.
- If a build-only import fails, confirm that it uses a declared package export and that browser code does not import Node-only tooling.
