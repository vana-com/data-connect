import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"

export default defineConfig({
  root: path.resolve(__dirname, "src/auth-page"),
  base: "/",
  publicDir: path.resolve(__dirname, "public"),
  plugins: [react(), tailwindcss()],
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
