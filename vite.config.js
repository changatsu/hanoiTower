import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" で相対パス出力にし、GitHub Pages のサブパス（/hanoiTower/）でも動くようにする
export default defineConfig({
  plugins: [react()],
  base: "./",
});
