import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three/src/renderers")) return "three-renderer";
          if (id.includes("node_modules/three")) return "three-core";
        },
      },
    },
  },
});
