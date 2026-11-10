import { defineConfig, devices } from "@playwright/test";
import { localSupabase } from "./e2e/localSupabase";

// Browser tests (npm run test:e2e). They build the site pointed at the LOCAL
// Supabase (backend/: npx supabase start) and refuse to run against anything
// else. See e2e/README.md.
const sb = localSupabase();
const PORT = 8081; // a port the edge functions accept (functions/_shared/cors.ts)

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // One at a time: the tests share two accounts, and a sign-out ends every
  // session of that account.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // A production build (what visitors get), in its own folder so dist/ is untouched.
    command: `npx vite build --outDir dist-e2e --emptyOutDir && npx vite preview --outDir dist-e2e --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    // Never reuse a server already on this port: it could point at the live project.
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      VITE_SUPABASE_URL: sb.url,
      VITE_SUPABASE_PUBLISHABLE_KEY: sb.anonKey,
    },
  },
});
