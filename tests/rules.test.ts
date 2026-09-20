import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

/**
 * These tests assert the one property the whole design rests on: a client can
 * read exactly what it should and can write essentially nothing, because every
 * scoring mutation goes through the server with the Admin SDK.
 *
 * Requires the emulator: `npm run emulators` in another terminal.
 */

const CHASE = "c1";
const OWNER = "owner-uid";
const COLLAB = "collab-uid";
const PLAYER = "player-uid";
const RIVAL = "rival-uid";
const STRANGER = "stranger-uid";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "isra-chase-rules-test",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => env?.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  // Seed the world with rules disabled, then assert against them enabled.
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "chases", CHASE), {
      ownerUid: OWNER,
      collaborators: { [COLLAB]: true },
      name: "Test chase",
    });
    await setDoc(doc(db, `chases/${CHASE}/participants`, PLAYER), {
      teamId: "teamA",
      displayName: "Player",
    });
    await setDoc(doc(db, `chases/${CHASE}/participants`, RIVAL), {
      teamId: "teamB",
      displayName: "Rival",
    });
    await setDoc(doc(db, `chases/${CHASE}/missions`, "m1"), {
      name: "Trivia",
      text: { acceptedResponses: ["the answer"], approximate: false },
    });
    await setDoc(doc(db, `chases/${CHASE}/teams`, "teamA"), {
      name: "Team A",
      points: 500,
    });
    await setDoc(doc(db, `chases/${CHASE}/adjustments`, "a1"), {
      teamId: "teamA",
      points: 50,
      reason: "Nice work",
    });
    await setDoc(doc(db, `chases/${CHASE}/broadcasts`, "sent"), {
      status: "sent",
      teamIds: null,
      body: "Go!",
    });
    await setDoc(doc(db, `chases/${CHASE}/private`, "settings"), {
      password: "super-secret",
      teamPasscodes: { teamA: "teamA-code" },
    });
    await setDoc(doc(db, `chases/${CHASE}/broadcasts`, "scheduled"), {
      status: "scheduled",
      teamIds: null,
      body: "Later",
    });
  });
});

const sub = (over: Record<string, unknown> = {}) => ({
  teamId: "teamA",
  status: "approved",
  hidden: false,
  feedVisible: true,
  points: 100,
  ...over,
});

async function seedSubmission(id: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `chases/${CHASE}/submissions`, id), data);
  });
}

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

describe("missions — the answer key must never reach a client", () => {
  it("denies a participant reading a mission", async () => {
    await assertFails(getDoc(doc(as(PLAYER), `chases/${CHASE}/missions`, "m1")));
  });

  it("allows the owner", async () => {
    await assertSucceeds(getDoc(doc(as(OWNER), `chases/${CHASE}/missions`, "m1")));
  });

  it("allows a collaborator", async () => {
    await assertSucceeds(getDoc(doc(as(COLLAB), `chases/${CHASE}/missions`, "m1")));
  });

  it("denies a stranger", async () => {
    await assertFails(getDoc(doc(as(STRANGER), `chases/${CHASE}/missions`, "m1")));
  });

  it("denies even the owner writing one from a client", async () => {
    await assertFails(
      updateDoc(doc(as(OWNER), `chases/${CHASE}/missions`, "m1"), { points: 9999 }),
    );
  });
});

describe("submissions — feed visibility", () => {
  it("lets a rival see an approved, visible submission", async () => {
    await seedSubmission("s1", sub());
    await assertSucceeds(getDoc(doc(as(RIVAL), `chases/${CHASE}/submissions`, "s1")));
  });

  it("hides a submission on a hidden-in-feed mission from rivals", async () => {
    await seedSubmission("s1", sub({ feedVisible: false }));
    await assertFails(getDoc(doc(as(RIVAL), `chases/${CHASE}/submissions`, "s1")));
  });

  it("hides a moderator-hidden submission from rivals", async () => {
    await seedSubmission("s1", sub({ hidden: true }));
    await assertFails(getDoc(doc(as(RIVAL), `chases/${CHASE}/submissions`, "s1")));
  });

  it("hides a pending submission from rivals", async () => {
    await seedSubmission("s1", sub({ status: "pending" }));
    await assertFails(getDoc(doc(as(RIVAL), `chases/${CHASE}/submissions`, "s1")));
  });

  it("always shows a team its own submission, whatever its state", async () => {
    await seedSubmission("s1", sub({ status: "pending", hidden: true, feedVisible: false }));
    await assertSucceeds(getDoc(doc(as(PLAYER), `chases/${CHASE}/submissions`, "s1")));
  });

  it("shows the organizer everything", async () => {
    await seedSubmission("s1", sub({ status: "pending", hidden: true, feedVisible: false }));
    await assertSucceeds(getDoc(doc(as(OWNER), `chases/${CHASE}/submissions`, "s1")));
  });

  it("shows a stranger nothing", async () => {
    await seedSubmission("s1", sub());
    await assertFails(getDoc(doc(as(STRANGER), `chases/${CHASE}/submissions`, "s1")));
  });
});

describe("scores are server-authoritative", () => {
  it("lets a participant read the leaderboard", async () => {
    await assertSucceeds(getDoc(doc(as(PLAYER), `chases/${CHASE}/teams`, "teamA")));
  });

  it("stops a participant awarding themselves points", async () => {
    await assertFails(
      updateDoc(doc(as(PLAYER), `chases/${CHASE}/teams`, "teamA"), { points: 999999 }),
    );
  });

  it("stops the owner writing points from a client too", async () => {
    await assertFails(
      updateDoc(doc(as(OWNER), `chases/${CHASE}/teams`, "teamA"), { points: 999999 }),
    );
  });

  it("stops a client creating a submission directly", async () => {
    await assertFails(
      setDoc(doc(as(PLAYER), `chases/${CHASE}/submissions`, "forged"), sub()),
    );
  });
});

describe("adjustments are a per-team audit trail", () => {
  it("lets a team read its own bonus history", async () => {
    await assertSucceeds(getDoc(doc(as(PLAYER), `chases/${CHASE}/adjustments`, "a1")));
  });

  it("stops a rival reading it", async () => {
    await assertFails(getDoc(doc(as(RIVAL), `chases/${CHASE}/adjustments`, "a1")));
  });
});

describe("broadcasts", () => {
  it("hides scheduled broadcasts from players", async () => {
    await assertFails(getDoc(doc(as(PLAYER), `chases/${CHASE}/broadcasts`, "scheduled")));
  });

  it("shows sent broadcasts to players", async () => {
    await assertSucceeds(getDoc(doc(as(PLAYER), `chases/${CHASE}/broadcasts`, "sent")));
  });

  it("shows scheduled broadcasts to the organizer", async () => {
    await assertSucceeds(getDoc(doc(as(OWNER), `chases/${CHASE}/broadcasts`, "scheduled")));
  });
});

describe("chases and profiles", () => {
  it("locks out anonymous readers", async () => {
    await assertFails(getDoc(doc(anon(), "chases", CHASE)));
  });

  it("stops any client writing the chase document", async () => {
    await assertFails(updateDoc(doc(as(OWNER), "chases", CHASE), { name: "hacked" }));
  });

  it("lets you write your own profile", async () => {
    await assertSucceeds(
      setDoc(doc(as(PLAYER), "users", PLAYER), { displayName: "Me" }),
    );
  });

  it("stops you writing someone else's profile", async () => {
    await assertFails(
      setDoc(doc(as(PLAYER), "users", OWNER), { displayName: "Hacked" }),
    );
  });

  it("denies unmatched collections via the catch-all", async () => {
    await assertFails(getDoc(doc(as(OWNER), "somethingElse", "x")));
  });
});

describe("join secrets never reach a client", () => {
  // The chase document is readable by any signed-in user, so the password and
  // team passcodes live in this organizer-only subdocument instead.
  it("denies a participant reading private/settings", async () => {
    await assertFails(getDoc(doc(as(PLAYER), `chases/${CHASE}/private`, "settings")));
  });

  it("denies a rival", async () => {
    await assertFails(getDoc(doc(as(RIVAL), `chases/${CHASE}/private`, "settings")));
  });

  it("denies a stranger", async () => {
    await assertFails(getDoc(doc(as(STRANGER), `chases/${CHASE}/private`, "settings")));
  });

  it("denies an anonymous reader", async () => {
    await assertFails(getDoc(doc(anon(), `chases/${CHASE}/private`, "settings")));
  });

  it("allows the owner", async () => {
    await assertSucceeds(getDoc(doc(as(OWNER), `chases/${CHASE}/private`, "settings")));
  });

  it("allows a collaborator", async () => {
    await assertSucceeds(getDoc(doc(as(COLLAB), `chases/${CHASE}/private`, "settings")));
  });

  it("denies even the owner writing it from a client", async () => {
    await assertFails(
      updateDoc(doc(as(OWNER), `chases/${CHASE}/private`, "settings"), {
        password: "changed",
      }),
    );
  });

  it("confirms the public chase document carries no password", async () => {
    const snap = await getDoc(doc(as(PLAYER), "chases", CHASE));
    expect(snap.data()?.password).toBeUndefined();
  });
});

it("the ruleset compiles", () => {
  expect(readFileSync("firestore.rules", "utf8")).toContain("rules_version");
});
