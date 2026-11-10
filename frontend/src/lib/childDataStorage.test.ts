import { beforeEach, describe, expect, it, vi } from "vitest";

// Captures the listener installChildDataCleanup registers, so a sign-out can be
// simulated without a Supabase project.
const authListeners: Array<(event: string) => void> = [];
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: (event: string) => void) => {
        authListeners.push(cb);
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
  },
}));

import { CHILD_DATA_SESSION_KEYS, clearChildData, installChildDataCleanup, isOwnedBy, withOwner } from "./childDataStorage";

const CHILD = JSON.stringify({ childName: "Zephyrine", childLastName: "Quillfeather" });

function fillStorage() {
  CHILD_DATA_SESSION_KEYS.forEach((key) => sessionStorage.setItem(key, CHILD));
  localStorage.setItem("assessment-form-data", CHILD); // written by older versions
  sessionStorage.setItem("unrelated-session", "keep");
  localStorage.setItem("unrelated-local", "keep");
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  authListeners.length = 0;
});

describe("clearChildData", () => {
  it("removes every child-data key and leaves other keys alone", () => {
    fillStorage();
    clearChildData();
    CHILD_DATA_SESSION_KEYS.forEach((key) => expect(sessionStorage.getItem(key)).toBeNull());
    expect(localStorage.getItem("assessment-form-data")).toBeNull();
    expect(sessionStorage.getItem("unrelated-session")).toBe("keep");
    expect(localStorage.getItem("unrelated-local")).toBe("keep");
  });
});

describe("installChildDataCleanup", () => {
  it("removes child data older versions left in localStorage at startup", () => {
    localStorage.setItem("assessment-form-data", CHILD);
    installChildDataCleanup();
    expect(localStorage.getItem("assessment-form-data")).toBeNull();
  });

  it("clears child data on sign-out, and only on sign-out", () => {
    installChildDataCleanup();
    expect(authListeners).toHaveLength(1);
    fillStorage();

    authListeners[0]("SIGNED_IN");
    authListeners[0]("TOKEN_REFRESHED");
    expect(sessionStorage.getItem("assessment-draft")).toBe(CHILD);

    authListeners[0]("SIGNED_OUT");
    CHILD_DATA_SESSION_KEYS.forEach((key) => expect(sessionStorage.getItem(key)).toBeNull());
    expect(localStorage.getItem("assessment-form-data")).toBeNull();
  });
});

describe("withOwner / isOwnedBy", () => {
  it("only lets the user the state was created for use it", () => {
    const state = withOwner({ formData: { childName: "Zephyrine" } }, "user-a");
    expect(isOwnedBy(state, "user-a")).toBe(true);
    expect(isOwnedBy(state, "user-b")).toBe(false);
    expect(isOwnedBy(state, undefined)).toBe(false);
  });

  it("rejects state without an owner", () => {
    expect(isOwnedBy(withOwner({}, undefined), undefined)).toBe(false);
    expect(isOwnedBy({ formData: {} }, "user-a")).toBe(false);
    expect(isOwnedBy(null, "user-a")).toBe(false);
  });
});

// Every browser-storage write in the app, read from the source. A new key that
// holds child data must be added to CHILD_DATA_SESSION_KEYS, or sign-out would
// leave it behind; localStorage outlives the tab, so it must not be written at all.
describe("browser storage writes in the app", () => {
  const sources = import.meta.glob(["/src/**/*.{ts,tsx}", "!/src/**/*.test.{ts,tsx}"], {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;

  const writes = Object.entries(sources).flatMap(([file, src]) =>
    [...src.matchAll(/\b(sessionStorage|localStorage)\.setItem\(\s*([^,]+?)\s*,/g)].map((m) => {
      const arg = m[2];
      const literal = arg.match(/^["'`]([^"'`]+)["'`]$/);
      const constant = !literal && src.match(new RegExp(`\\b${arg}\\s*=\\s*["'\`]([^"'\`]+)["'\`]`));
      return { file, storage: m[1], key: literal?.[1] ?? (constant ? constant[1] : null), arg };
    })
  );

  it("finds the writes (guards against the scan silently matching nothing)", () => {
    expect(writes.length).toBeGreaterThan(3);
  });

  it("writes nothing to localStorage", () => {
    expect(writes.filter((w) => w.storage === "localStorage")).toEqual([]);
  });

  it("clears every sessionStorage key on sign-out", () => {
    const unresolved = writes.filter((w) => w.key === null);
    expect(unresolved, "use a string literal or a const in the same file for the key").toEqual([]);
    const notCleared = writes.filter((w) => !(CHILD_DATA_SESSION_KEYS as readonly string[]).includes(w.key!));
    expect(notCleared).toEqual([]);
  });
});
