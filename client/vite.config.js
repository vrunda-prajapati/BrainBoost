import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/",
  plugins: [
    react(),
  ],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  server: {
    proxy: {
      "/api": {
        target: "https://brainboost-production.up.railway.app",
        changeOrigin: true,
      },
    },
  },
});