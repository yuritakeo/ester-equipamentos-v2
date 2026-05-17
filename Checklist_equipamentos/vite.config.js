import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import CopyRoutesJsonPlugin from "./copyRoutesJsonPlugin.js";
import GeneratePwaServiceWorkerPlugin from "./generatePwaServiceWorkerPlugin.js";

export default defineConfig({
  base: "/",
  plugins: [react(), CopyRoutesJsonPlugin(), GeneratePwaServiceWorkerPlugin()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("react") || id.includes("scheduler")) return "react-vendor";
          if (id.includes("react-router")) return "router-vendor";
          if (id.includes("xlsx") || id.includes("exceljs")) return "spreadsheet-vendor";
          if (id.includes("jspdf") || id.includes("html2canvas") || id.includes("dompurify")) return "document-vendor";
          if (id.includes("rsuite") || id.includes("react-select")) return "ui-vendor";

          return "vendor";
        },
      },
    },
  },
});
