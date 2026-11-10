import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export interface LocalSupabase {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

const LOCAL_HOSTS = ["127.0.0.1", "localhost"];

/**
 * The local Supabase started from backend/ (`npx supabase start`). The browser
 * tests create accounts and reports, so they must never run against the live
 * project: this throws unless the API is on this machine.
 *
 * Read once in the Playwright main process and handed to workers through
 * process.env.
 */
export function localSupabase(): LocalSupabase {
  if (!process.env.E2E_SUPABASE_URL) {
    let status: Record<string, string>;
    try {
      const out = execSync("npx supabase status -o json", {
        cwd: fileURLToPath(new URL("../../backend", import.meta.url)),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      status = JSON.parse(out);
    } catch {
      throw new Error(
        "Local Supabase is not running. Start Docker Desktop, then run `npx supabase start` in backend/ " +
          "(see frontend/e2e/README.md)."
      );
    }
    process.env.E2E_SUPABASE_URL = status.API_URL;
    process.env.E2E_SUPABASE_ANON_KEY = status.ANON_KEY;
    process.env.E2E_SUPABASE_SERVICE_ROLE_KEY = status.SERVICE_ROLE_KEY;
  }

  const url = process.env.E2E_SUPABASE_URL!;
  if (!LOCAL_HOSTS.includes(new URL(url).hostname)) {
    throw new Error(`Refusing to run browser tests against ${url}: only a local Supabase is allowed.`);
  }
  return {
    url,
    anonKey: process.env.E2E_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!,
  };
}
