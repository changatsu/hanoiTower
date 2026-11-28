import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./jelly.css";

// iOS Safari で、指 1 本のドラッグによるページのスクロールや引っぱりを止める（ゼリーのドラッグを優先）
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
