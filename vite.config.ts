import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        // Network-only: no runtime caching — app requires Convex (internet)
        runtimeCaching: [],
        navigateFallback: null,
      },
      manifest: {
        name: "SideQuest Starter",
        short_name: "SideQuest",
        description: "Your starter template for building full-stack apps",
        theme_color: "#1a1a2e",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        // TODO: Generate proper PWA icons (192x192, 512x512 PNG).
        // For now relying on favicon SVGs in /public.
        icons: [
          {
            src: "/favicon-light.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/favicon-dark.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
