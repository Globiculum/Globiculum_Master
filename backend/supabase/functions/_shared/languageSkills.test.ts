import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { describeLanguageSkills, sanitizeLanguageSkills } from "./languageSkills.ts";

const clean = (v: unknown, max: number) => String(v ?? "").replace(/[<>{}]/g, "").trim().slice(0, max);

Deno.test("sanitizeLanguageSkills keeps known skills only and drops bad entries", () => {
  assertEquals(
    sanitizeLanguageSkills({ Hindi: ["speak", "fly", "understand"], "<>": ["read"], Telugu: "speak", Sanskrit: [] }, clean),
    { Hindi: ["understand", "speak"], Sanskrit: [] },
  );
  assertEquals(sanitizeLanguageSkills(["Hindi"], clean), undefined);
  assertEquals(sanitizeLanguageSkills(null, clean), undefined);
});

Deno.test("describeLanguageSkills says what the child can and can't do yet", () => {
  assertEquals(
    describeLanguageSkills({ Hindi: ["understand", "speak"], Sanskrit: [], Tamil: ["understand", "speak", "read", "write"] }),
    "Hindi: understands, speaks; can't yet read, write. Sanskrit: new to it (never studied). Tamil: understands, speaks, reads and writes",
  );
});
