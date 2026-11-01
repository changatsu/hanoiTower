import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./neko.css";

// iOS Safari で、指 1 本のドラッグによるページのスクロールや引っぱり（ゴムのような動き）を止める。
// 2 本指のピンチ拡大は残す。
document.addEventListener(
  "touchmove",
  (e) => {
    if (e.touches.length === 1) e.preventDefault();
  },
  { passive: false }
);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
