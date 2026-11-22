import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" で相対パス出力にし、GitHub Pages のサブパス（/hanoiTower/）でも動くようにする
// ページは 3 つ：ハノイの塔（/）、ねこだな（/neko/）、まんぷく学食（/gakushoku/）
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        neko: resolve(import.meta.dirname, "neko/index.html"),
        gakushoku: resolve(import.meta.dirname, "gakushoku/index.html"),
      },
    },
  },
});
