import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"

/**
 * Replace %PRIVY_APP_ID% / %PRIVY_CLIENT_ID% placeholders in index.html
 * with VITE_PRIVY_* env vars so `auth:dev` works standalone.
 * In production these are injected by the Rust backend (auth.rs).
 */
function authHtmlPlaceholders(): Plugin {
  return {
    name: "auth-html-placeholders",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        return html
          .replace("%PRIVY_APP_ID%", process.env.VITE_PRIVY_APP_ID || "%PRIVY_APP_ID%")
          .replace("%PRIVY_CLIENT_ID%", process.env.VITE_PRIVY_CLIENT_ID || "%PRIVY_CLIENT_ID%")
      },
    },
  }
}

export default defineConfig({
  root: path.resolve(__dirname, "src/auth-page"),
  base: "/",
  publicDir: path.resolve(__dirname, "public"),
  envDir: path.resolve(__dirname), // read .env.local from project root
  plugins: [authHtmlPlaceholders(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    emptyOutDir: true,
    outDir: path.resolve(__dirname, "src-tauri/auth-page"),
  },
})
