import { defineConfig } from "vitest/config";
import path from "path";

// Unit tests (npm test). Browser tests live in e2e/ and run with Playwright
// (npm run test:e2e), not here.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
  },
});
