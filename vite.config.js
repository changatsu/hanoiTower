import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" で相対パス出力にし、GitHub Pages のサブパス（/hanoiTower/）でも動くようにする
// ページは 2 つ：ハノイの塔（/）と ねこだな（/neko/）
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        neko: resolve(import.meta.dirname, "neko/index.html"),
      },
    },
  },
});
