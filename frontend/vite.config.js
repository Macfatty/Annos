import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173, // (valfritt – standard är 5173)
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: "localhost",
        configure: (proxy, _options) => {
          proxy.on("proxyRes", (proxyRes, req, res) => {
            // Log för debugging
            if (proxyRes.headers["set-cookie"]) {
              console.log("[VITE PROXY] Set-Cookie:", proxyRes.headers["set-cookie"]);
            }
          });
        }
      }
    }
  }
});
