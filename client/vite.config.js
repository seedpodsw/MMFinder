import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function storyExports() {
  return {
    name: "story-exports",
    enforce: "pre",
    transform(code, id) {
      const file = id.split("?")[0].replace(/\\/g, "/");
      if (!file.endsWith("/shared/story.js")) return null;
      if (!/module\.exports\s*=/.test(code)) return null;
      return {
        code: code.replace(/module\.exports\s*=\s*\{([\s\S]*?)\};/, "export {$1};"),
        map: null,
      };
    },
  };
}

export default defineConfig({
  root: path.resolve(__dirname),
  base: "./",
  plugins: [storyExports(), react()],
  server: {
    port: 5173,
    fs: {
      allow: [path.resolve(__dirname, "..")],
    },
  },
  build: {
    outDir: path.resolve(__dirname, "../dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        clockcountdown: path.resolve(__dirname, "clockcountdown/index.html"),
      },
    },
    commonjsOptions: {
      include: [/shared[/\\]story\.js/, /node_modules/],
    },
  },
});
