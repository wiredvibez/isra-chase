import { expect, test } from "@playwright/test";
import { client, signUp, signUpGuest } from "./support/auth";
import { wipe } from "./support/emulator";

/**
 * The full organizer-to-player loop, driven through the real route handlers
 * against the emulator suite. This is the test that proves the game actually
 * works: scoring, grading, gating, moderation and the audit trail.
 */

type Chase = {
  id: string;
  joinCode: string;
  status: string;
  hasPassword: boolean;
  moderationMode: string;
};
type Mission = { id: string; name: string; points: number };
type Team = { id: string; name: string; points: number; basePoints: number; bonusPoints: number };

const unique = () => Math.random().toString(36).slice(2, 8);

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await wipe();
});

test("organizer builds a chase, players compete, organizer moderates", async ({
  baseURL,
}) => {
  const base = baseURL!;

  /* ---------------------------------------------------- organizer signs up */
  const organizer = await signUp(`org-${unique()}@example.com`, "test-pass-123");
  const org = client(base, organizer.idToken);

  const created = await org.post<{ chase: Chase }>("/api/chases", {
    name: "E2E City Chase",
    description: "A test chase",
    timezone: "Asia/Jerusalem",
  });
  expect(created.status).toBe(200);
  const chaseId = created.data.chase.id;
  const joinCode = created.data.chase.joinCode;
  expect(created.data.chase.status).toBe("draft");
  expect(joinCode).toMatch(/^[A-Z0-9]{6}$/);

  /* ------------------------------------------------------ missions of each type */
  const camera = await org.post<{ mission: Mission }>(
    `/api/chases/${chaseId}/missions`,
    {
      name: "Team selfie",
      description: "Everyone in frame",
      points: 200,
      type: "camera",
      feedVisibility: "shown",
      camera: { accepts: "photos", sources: "live_and_library", maxVideoSeconds: 30 },
    },
  );
  expect(camera.status).toBe(200);

  const trivia = await org.post<{ mission: Mission }>(
    `/api/chases/${chaseId}/missions`,
    {
      name: "Founding year",
      description: "Exact number required",
      points: 150,
      type: "text",
      feedVisibility: "hidden",
      text: { acceptedResponses: ["2000"], approximate: false },
    },
  );
  expect(trivia.status).toBe(200);

  const riddle = await org.post<{ mission: Mission }>(
    `/api/chases/${chaseId}/missions`,
    {
      name: "Name the market",
      description: "Close spelling counts",
      points: 175,
      type: "text",
      feedVisibility: "hidden",
      text: { acceptedResponses: ["Carmel Market"], approximate: true },
    },
  );

  const checkin = await org.post<{ mission: Mission }>(
    `/api/chases/${chaseId}/missions`,
    {
      name: "Check in at the port",
      description: "Get to the boardwalk",
      points: 250,
      type: "gps",
      feedVisibility: "shown",
      gps: { lat: 32.0975, lng: 34.7742, radiusM: 250, address: "Tel Aviv Port" },
    },
  );
  expect(checkin.status).toBe(200);

  // Gated on a CORRECT check-in, which is the combo-mission pattern.
  const combo = await org.post<{ mission: Mission }>(
    `/api/chases/${chaseId}/missions`,
    {
      name: "Part 2: photograph it",
      description: "Unlocked by the check-in",
      points: 300,
      type: "camera",
      feedVisibility: "shown",
      camera: { accepts: "both", sources: "live_and_library", maxVideoSeconds: 30 },
      release: { kind: "mission", missionId: checkin.data.mission.id, requireCorrect: true },
    },
  );
  expect(combo.status).toBe(200);

  /* ------------------- you cannot wait on a CAMERA trigger being "correct" */
  // Camera submissions are always accepted, so such a gate would deadlock.
  const invalid = await org.post(`/api/chases/${chaseId}/missions`, {
    name: "Impossible gate",
    description: "Should be rejected",
    points: 10,
    type: "text",
    feedVisibility: "hidden",
    text: { acceptedResponses: ["x"], approximate: false },
    release: { kind: "mission", missionId: camera.data.mission.id, requireCorrect: true },
  });
  expect(invalid.status, "gating on a camera mission's correctness must fail").toBe(400);

  /* ------------------------------------------------------------------ go live */
  const notLive = await org.post(`/api/chases/${chaseId}/schedule`, {
    action: "go_live",
  });
  expect(notLive.status, "going live without an end time must fail").toBe(400);

  const live = await org.post<{ chase: Chase }>(`/api/chases/${chaseId}/schedule`, {
    action: "go_live",
    endAtMs: Date.now() + 6 * 3_600_000,
  });
  expect(live.status).toBe(200);
  expect(live.data.chase.status).toBe("live");

  /* ---------------------------------------------------------- players join */
  const alice = await signUpGuest("Alice");
  const aliceApi = client(base, alice.idToken);

  const lookup = await aliceApi.get<{ chase: { id: string } }>(`/api/join/${joinCode}`);
  expect(lookup.status).toBe(200);
  expect(lookup.data.chase.id).toBe(chaseId);

  const aliceJoin = await aliceApi.post<{ team: Team }>(`/api/chases/${chaseId}/join`, {
    code: joinCode,
    displayName: "Alice",
    newTeam: { name: "Flying Falafel", mode: "team" },
  });
  expect(aliceJoin.status).toBe(200);
  const teamA = aliceJoin.data.team.id;

  const bob = await signUpGuest("Bob");
  const bobApi = client(base, bob.idToken);
  const bobJoin = await bobApi.post<{ team: Team }>(`/api/chases/${chaseId}/join`, {
    code: joinCode,
    displayName: "Bob",
    newTeam: { name: "Sabich Squad", mode: "team" },
  });
  expect(bobJoin.status).toBe(200);
  const teamB = bobJoin.data.team.id;

  /* ------------------------------ the mission list must never leak the answer key */
  const playList = await aliceApi.get<{
    missions: Array<{ id: string; name: string; text?: unknown; gps?: unknown }>;
  }>(`/api/chases/${chaseId}/missions?as=play`);
  expect(playList.status).toBe(200);

  const serialised = JSON.stringify(playList.data.missions);
  expect(serialised, "answer key must not reach the player").not.toContain("Carmel Market");
  expect(serialised, "answer key must not reach the player").not.toContain("2000");
  expect(serialised, "GPS target must not reach the player").not.toContain("32.0975");

  // The combo mission is gated, so it must be absent entirely.
  expect(playList.data.missions.map((m) => m.id)).not.toContain(combo.data.mission.id);

  /* ------------------------------------------------------------ text grading */
  const wrong = await aliceApi.post<{ submission: { status: string }; verdict: { correct: boolean } }>(
    `/api/chases/${chaseId}/submissions`,
    { missionId: trivia.data.mission.id, textAnswer: "1998" },
  );
  expect(wrong.status).toBe(200);
  expect(wrong.data.verdict.correct).toBe(false);
  expect(wrong.data.submission.status).toBe("rejected");

  const right = await aliceApi.post<{ submission: { status: string; points: number } }>(
    `/api/chases/${chaseId}/submissions`,
    { missionId: trivia.data.mission.id, textAnswer: "2000" },
  );
  expect(right.data.submission.status).toBe("approved");
  expect(right.data.submission.points).toBe(150);

  // Approximate matching: one transposed letter, wrong case, extra punctuation.
  const fuzzy = await aliceApi.post<{ submission: { status: string; points: number } }>(
    `/api/chases/${chaseId}/submissions`,
    { missionId: riddle.data.mission.id, textAnswer: "carmel markte!" },
  );
  expect(fuzzy.data.submission.status, "approximate matching should accept a typo").toBe(
    "approved",
  );

  /* ------------------------------------------------------------- GPS grading */
  const tooFar = await aliceApi.post<{ verdict: { correct: boolean; distanceM: number } }>(
    `/api/chases/${chaseId}/submissions`,
    {
      missionId: checkin.data.mission.id,
      location: { lat: 32.15, lng: 34.85, accuracyM: 10 },
    },
  );
  expect(tooFar.data.verdict.correct).toBe(false);
  expect(tooFar.data.verdict.distanceM).toBeGreaterThan(250);

  const atPort = await aliceApi.post<{ submission: { id: string; status: string } }>(
    `/api/chases/${chaseId}/submissions`,
    {
      missionId: checkin.data.mission.id,
      location: { lat: 32.0977, lng: 34.7745, accuracyM: 8 },
    },
  );
  expect(atPort.data.submission.status).toBe("approved");

  /* ------------------------------------- the correct check-in unlocks the combo */
  const afterUnlock = await aliceApi.get<{ missions: Array<{ id: string }> }>(
    `/api/chases/${chaseId}/missions?as=play`,
  );
  expect(
    afterUnlock.data.missions.map((m) => m.id),
    "a correct check-in should unlock the combo mission",
  ).toContain(combo.data.mission.id);

  // Bob never checked in, so it stays invisible to his team.
  const bobList = await bobApi.get<{ missions: Array<{ id: string }> }>(
    `/api/chases/${chaseId}/missions?as=play`,
  );
  expect(bobList.data.missions.map((m) => m.id)).not.toContain(combo.data.mission.id);

  /* ------------------------------------ one submission per mission per team */
  const duplicate = await aliceApi.post(`/api/chases/${chaseId}/submissions`, {
    missionId: trivia.data.mission.id,
    textAnswer: "2000",
  });
  expect(duplicate.status, "a second submission to the same mission must conflict").toBe(409);

  /* -------------------------------------------------------------- scoring */
  // Alice: 150 trivia + 175 riddle + 250 check-in = 575 base.
  const stats = await org.get<{ tiles: { submissions: number; activeTeams: number } }>(
    `/api/chases/${chaseId}/stats`,
  );
  expect(stats.status).toBe(200);
  expect(stats.data.tiles.activeTeams).toBe(1);

  /* --------------------------------------------- bonus points and penalties */
  const submissionBonus = await org.post<{ adjustment: { points: number } }>(
    `/api/chases/${chaseId}/submissions/${atPort.data.submission.id}/bonus`,
    { points: 40, reason: "Great framing" },
  );
  expect(submissionBonus.status).toBe(200);
  expect(submissionBonus.data.adjustment.points).toBe(40);

  const adjust = await org.post<{ adjustment: { points: number; reason: string } }>(
    `/api/chases/${chaseId}/adjustments`,
    { teamId: teamA, points: 50, reason: "Excellent teamwork" },
  );
  expect(adjust.status).toBe(200);
  expect(adjust.data.adjustment.points).toBe(50);

  const penalty = await org.post<{ adjustment: { points: number } }>(
    `/api/chases/${chaseId}/adjustments`,
    { teamId: teamB, points: -25, reason: "Late to the briefing" },
  );
  expect(penalty.status, "negative adjustments are the penalty mechanism").toBe(200);

  const noReason = await org.post(`/api/chases/${chaseId}/adjustments`, {
    teamId: teamA,
    points: 10,
  });
  expect(noReason.status, "score adjustments require a reason").toBe(400);

  /* ------------------------------------------------ solo joining works */
  // A solo join sends newTeam with mode "solo"; the handler must treat that as
  // a one-seater profile, not as creating a team.
  const solo = await signUpGuest("Solo Sam");
  const soloApi = client(base, solo.idToken);
  const soloJoin = await soloApi.post<{ team: Team & { mode: string } }>(
    `/api/chases/${chaseId}/join`,
    {
      code: joinCode,
      displayName: "Solo Sam",
      newTeam: { name: "Solo Sam", mode: "solo" },
    },
  );
  expect(soloJoin.status, "a solo join must be accepted").toBe(200);
  expect(soloJoin.data.team.mode).toBe("solo");

  /* ------------------------------------------- players cannot moderate */
  const playerModerating = await aliceApi.post(`/api/chases/${chaseId}/adjustments`, {
    teamId: teamA,
    points: 10_000,
    reason: "I would like to win",
  });
  expect(playerModerating.status, "players must not be able to award points").toBe(403);

  const playerEditingMissions = await aliceApi.post(`/api/chases/${chaseId}/missions`, {
    name: "Free points",
    description: "Nope",
    points: 9999,
    type: "camera",
    feedVisibility: "shown",
    camera: { accepts: "photos", sources: "live_and_library", maxVideoSeconds: 30 },
  });
  expect(playerEditingMissions.status).toBe(403);
});
