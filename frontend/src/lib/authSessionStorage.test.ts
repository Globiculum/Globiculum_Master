import { afterEach, describe, expect, it } from "vitest";
import { authSessionStorage, keepNextSession } from "./authSessionStorage";

const KEY = "sb-test-auth-token";

afterEach(() => {
  keepNextSession(true);
  sessionStorage.clear();
  localStorage.clear();
});

describe("authSessionStorage (Keep me signed in)", () => {
  it("keeps the login in localStorage by default", () => {
    authSessionStorage.setItem(KEY, "token");
    expect(localStorage.getItem(KEY)).toBe("token");
    expect(sessionStorage.getItem(KEY)).toBeNull();
    expect(authSessionStorage.getItem(KEY)).toBe("token");
  });

  it("keeps it for this tab only when unticked, and never in localStorage", () => {
    keepNextSession(false);
    authSessionStorage.setItem(KEY, "token");
    expect(sessionStorage.getItem(KEY)).toBe("token");
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("leaves a tab-only login in the tab when its token refreshes later", () => {
    keepNextSession(false);
    authSessionStorage.setItem(KEY, "token-1");
    keepNextSession(true); // reset after the sign-in, as authClient does
    authSessionStorage.setItem(KEY, "token-2");
    expect(sessionStorage.getItem(KEY)).toBe("token-2");
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("removes the login from both places on sign-out", () => {
    localStorage.setItem(KEY, "a");
    sessionStorage.setItem(KEY, "b");
    authSessionStorage.removeItem(KEY);
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });
});
