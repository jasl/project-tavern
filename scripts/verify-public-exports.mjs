// SPDX-License-Identifier: MIT
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { API } from "typescript/unstable/sync";

export async function verifyPublicExportsV1(root) {
  const base = join(root, "engine/packages/base");
  const inventory = JSON.parse(await readFile(join(base, "public-exports.v1.json"), "utf8"));
  const manifest = JSON.parse(await readFile(join(base, "package.json"), "utf8"));
  const errors = [];
  const api = new API({ cwd: root });
  const snapshot = api.updateSnapshot({ openProjects: [join(root, "tsconfig.check.json")] });
  const project = snapshot.getProject(join(root, "tsconfig.check.json"));
  try {
    if (project === undefined) throw new TypeError("TypeScript project was not loaded");
    for (const [entrypoint, reviewed] of Object.entries(inventory.entrypoints)) {
      const manifestTarget = manifest.exports?.[entrypoint];
      if (manifestTarget !== reviewed.target) {
        errors.push(
          `${inventory.package} ${entrypoint} target mismatch: expected ${reviewed.target}, got ${String(manifestTarget)}`,
        );
        continue;
      }
      const sorted = [...reviewed.exports].sort();
      if (reviewed.exports.some((value, index) => value !== sorted[index])) {
        errors.push(`${inventory.package} ${entrypoint} inventory exports must be sorted`);
      }
      const target = join(base, reviewed.target);
      const source = await readFile(target, "utf8");
      if (/\bexport\s*\*/u.test(source)) {
        errors.push(
          `${inventory.package} ${entrypoint} must use explicit named exports; export * is forbidden`,
        );
        continue;
      }
      const file = project.program.getSourceFile(target);
      const symbol = file && project.checker.getSymbolAtLocation(file);
      const actual =
        symbol === undefined
          ? []
          : [...symbol.getExports().values()].map(({ name }) => name).sort();
      const expected = [...reviewed.exports].sort();
      for (const name of expected)
        if (!actual.includes(name))
          errors.push(`${inventory.package} ${entrypoint} is missing export: ${name}`);
      for (const name of actual)
        if (!expected.includes(name))
          errors.push(`${inventory.package} ${entrypoint} has unlisted export: ${name}`);
    }
  } finally {
    snapshot.dispose();
    api.close();
  }
  return errors.sort();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const errors = await verifyPublicExportsV1(root);
  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else console.log("public export verification passed");
}
