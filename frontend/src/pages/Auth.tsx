import { Navigate, useSearchParams } from "react-router-dom";
import { safeFormPath, signupPath } from "@/lib/afterSignIn";

/**
 * The old combined sign-in page. Log in and Sign up are now their own pages
 * (/login, /signup); this keeps old links and bookmarks working. Coming from a
 * form (?next=), most people are new, so it opens Sign up, as the old page did.
 */
const Auth = () => {
  const [searchParams] = useSearchParams();
  const next = safeFormPath(searchParams.get("next"));
  return <Navigate to={next ? signupPath(next) : "/login"} replace />;
};

export default Auth;
