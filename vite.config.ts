import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import { execSync } from "child_process"
import path from "path"
import tailwindcss from "@tailwindcss/vite"

// Get git commit hash
const commitHash = execSync("git rev-parse --short HEAD").toString().trim()

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "happy-dom",
  },
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
})
