import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    server: {
      host: "::",
      port: 8080,
      // Lets an ngrok tunnel reach the dev server (Vite blocks unknown hosts).
      allowedHosts: [".ngrok-free.app", ".ngrok-free.dev", ".ngrok.app"],
      // Supabase Edge Functions only accept browsers from the live domains and
      // localhost (backend/supabase/functions/_shared/cors.ts), so a tunnel page
      // calls Supabase through this same-origin path instead (see
      // src/integrations/supabase/client.ts).
      proxy: env.VITE_SUPABASE_URL
        ? {
            "/supabase": {
              target: env.VITE_SUPABASE_URL,
              changeOrigin: true,
              ws: true,
              rewrite: (p) => p.replace(/^\/supabase/, ""),
            },
          }
        : undefined,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
