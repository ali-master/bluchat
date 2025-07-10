import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import wasm from "vite-plugin-wasm";
import path from "node:path";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    open: true,
    strictPort: true,
    allowedHosts: true,
    hmr: {
      overlay: true,
    },
  },
  experimental: {
    hmrPartialAccept: true,
    importGlobRestoreExtension: true,
  },
  appType: "spa",
  clearScreen: true,
  envPrefix: "BLU",
  logLevel: "error",
  dev: {
    sourcemap: true,
    recoverable: true,
    preTransformRequests: true,
  },
  css: {
    devSourcemap: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    wasm(),
    nodePolyfills({
      include: ["crypto", "util", "buffer"],
    }),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "robots.txt"],
      manifest: {
        name: "BluChat",
        short_name: "BluChat",
        description: "Secure offline Bluetooth messaging",
        theme_color: "#1a1a1a",
        background_color: "#000000",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
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
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    include: ["argon2-browser"],
  },
});
