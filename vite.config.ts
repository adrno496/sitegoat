import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "prompt",
      injectManifest: { globPatterns: ["**/*.{js,css,html,json,png,svg,woff2}"] },
      includeAssets: ["favicon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "Journal 360 Mobile",
        short_name: "Journal 360°",
        description: "Votre mémoire de veille privée",
        lang: "fr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#f7f5ef",
        theme_color: "#153f3b",
        file_handlers: [
          { action: "/open", accept: { "text/html": [".html", ".htm"] } },
        ],
        share_target: {
          action: "/share-target",
          method: "POST",
          enctype: "multipart/form-data",
          params: {
            files: [
              { name: "journals", accept: ["text/html", ".html", ".htm"] },
            ],
          },
        },
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
});
