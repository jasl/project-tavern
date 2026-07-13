import { basename, dirname, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const repositoryRoot = import.meta.dirname;
const applicationRoots = Object.freeze({
  "e2e-web": Object.freeze({
    html: resolve(repositoryRoot, "game/stories/e2e/index.html"),
    outDir: resolve(repositoryRoot, "dist/e2e"),
  }),
});

function rejectCallerBuildRootV1(argv: readonly string[]) {
  const buildIndex = argv.indexOf("build");
  if (buildIndex < 0) return;
  const optionsWithValues = new Set([
    "--base",
    "--config",
    "--configLoader",
    "--logLevel",
    "--mode",
    "--outDir",
    "-c",
    "-l",
    "-m",
  ]);
  for (let index = buildIndex + 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === undefined) continue;
    if (optionsWithValues.has(argument)) {
      index += 1;
      continue;
    }
    if (argument === "--") continue;
    if (argument.startsWith("-")) continue;
    throw new TypeError(`caller-supplied application root is forbidden: ${argument}`);
  }
}

export default defineConfig(({ mode }) => {
  rejectCallerBuildRootV1(process.argv.slice(2));
  const application = applicationRoots[mode as keyof typeof applicationRoots];
  if (application === undefined) {
    throw new TypeError(`unsupported Project Tavern build mode: ${mode}`);
  }
  const storyRoot = dirname(application.html);
  const htmlName = basename(application.html);
  return {
    root: storyRoot,
    base: "./",
    publicDir: false,
    plugins: [
      react(),
      {
        name: "project-tavern-closed-application-root",
        configResolved(config) {
          const actualOutDir = resolve(config.root, config.build.outDir);
          if (resolve(config.root) !== storyRoot) {
            throw new TypeError(`caller-supplied application root is forbidden: ${config.root}`);
          }
          if (actualOutDir !== application.outDir) {
            throw new TypeError(`caller-supplied output directory is forbidden: ${actualOutDir}`);
          }
          if (config.publicDir !== "") {
            throw new TypeError("E2E Artifact public directory must remain disabled");
          }
          if (
            config.command === "build" &&
            (config.base !== "./" ||
              config.build.emptyOutDir !== true ||
              config.build.sourcemap !== false)
          ) {
            throw new TypeError("E2E Artifact build invariants were overridden");
          }
        },
      },
      {
        name: "project-tavern-index-html",
        enforce: "post",
        generateBundle(_options, bundle) {
          const htmlEntry = Object.entries(bundle).find(([, output]) =>
            output.fileName.endsWith(htmlName),
          );
          if (htmlEntry === undefined) {
            throw new TypeError(`missing ${mode} HTML output`);
          }
          const [, output] = htmlEntry;
          output.fileName = "index.html";
        },
      },
    ],
    build: {
      outDir: application.outDir,
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: { input: application.html },
    },
  };
});
