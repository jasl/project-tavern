import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const repositoryRoot = import.meta.dirname;
const storyRoot = resolve(repositoryRoot, "game/stories/sandbox");

export default defineConfig(({ mode }) => {
  if (mode !== "player" && mode !== "developer") {
    throw new TypeError(`unsupported Project Tavern build mode: ${mode}`);
  }
  const html = resolve(storyRoot, `${mode}.html`);
  const outDir = process.env.TAVERN_OUT_DIR
    ? resolve(process.env.TAVERN_OUT_DIR)
    : resolve(repositoryRoot, `dist/${mode}`);
  return {
    root: storyRoot,
    base: "./",
    publicDir: false,
    plugins: [
      react(),
      {
        name: "project-tavern-index-html",
        enforce: "post",
        generateBundle(_options, bundle) {
          const htmlEntry = Object.entries(bundle).find(([, output]) =>
            output.fileName.endsWith(`${mode}.html`),
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
      outDir,
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: { input: html },
    },
  };
});
