/**
 * Where the login (the Supabase session) is kept, for "Keep me signed in".
 *
 * Ticked (the default, and how it worked before): localStorage, so the login
 * survives closing the browser. Unticked: sessionStorage, so it ends with the
 * tab. Only the login and Supabase's own sign-in keys live here; child data
 * never does (see childDataStorage.ts). Sign-out removes the login from both.
 *
 * The choice applies to the session saved by the sign-in that asked for it
 * (see keepNextSession). A login already kept for this tab stays there when
 * its token refreshes.
 */

let keepNext = true;

/** Set just before signing in; `false` keeps that session for this tab only. */
export function keepNextSession(keep: boolean): void {
  keepNext = keep;
}

export const authSessionStorage = {
  getItem(key: string): string | null {
    return sessionStorage.getItem(key) ?? localStorage.getItem(key);
  },
  setItem(key: string, value: string): void {
    const tabOnly = !keepNext || sessionStorage.getItem(key) !== null;
    if (tabOnly) {
      sessionStorage.setItem(key, value);
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key);
    }
  },
  removeItem(key: string): void {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  },
};
