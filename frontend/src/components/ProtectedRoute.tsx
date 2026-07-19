import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

interface ProtectedRouteProps {
  children: React.ReactNode;
  skipOnboardingCheck?: boolean;
}

const ProtectedRoute = ({ children, skipOnboardingCheck = false }: ProtectedRouteProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();

      let nextSession: Session | null = session;
      const expiresAtMs = nextSession?.expires_at ? nextSession.expires_at * 1000 : null;

      // If token is expired / about to expire, refresh it before allowing access
      if (nextSession && expiresAtMs && expiresAtMs < Date.now() + 60_000) {
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          await supabase.auth.signOut();
          nextSession = null;
        } else {
          nextSession = data.session ?? null;
        }
      }

      if (!active) return;
      setSession(nextSession);

      // Check onboarding status for authenticated users
      if (nextSession?.user && !skipOnboardingCheck) {
        const { data: profile } = await supabase
          .from("student_profiles")
          .select("id")
          .eq("user_id", nextSession.user.id)
          .maybeSingle();

        if (active) setNeedsOnboarding(!profile);
      } else {
        if (active) setNeedsOnboarding(false);
      }

      if (active) setLoading(false);
    };

    loadSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [skipOnboardingCheck]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
