/**
 * Seeds a fully-populated demo chase so the Studio and the player app have
 * something real to render: every mission type, locked and gated missions,
 * teams on different scores, graded submissions, a bonus audit trail and a
 * scheduled broadcast.
 *
 *   npm run seed                 # creates/refreshes the demo chase
 *   npm run seed -- --reset      # deletes it first
 *
 * Reads credentials from .env.local. Safe to re-run.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

/* ------------------------------------------------------------------ env -- */

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const env: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const i = trimmed.indexOf("=");
    env[trimmed.slice(0, i)] = trimmed.slice(i + 1);
  }
  return env;
}

const env = loadEnv();
const serviceAccountRaw = env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountRaw) {
  console.error("FIREBASE_SERVICE_ACCOUNT_KEY is missing from .env.local");
  process.exit(1);
}
const sa = JSON.parse(
  serviceAccountRaw.trim().startsWith("{")
    ? serviceAccountRaw
    : Buffer.from(serviceAccountRaw, "base64").toString("utf8"),
);

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: sa.private_key,
    }),
    projectId: sa.project_id,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const db = getFirestore();

/* ------------------------------------------------------------- constants -- */

const CHASE_ID = "demo-tel-aviv-chase";
const JOIN_CODE = "TLV24X";
const ORGANIZER = {
  uid: "seed-organizer",
  email: "organizer@isra-chase.demo",
  name: "דנה מארגנת",
};

const HOUR = 3_600_000;
const now = Date.now();
const startAt = Timestamp.fromMillis(now - 2 * HOUR);
const endAt = Timestamp.fromMillis(now + 22 * HOUR);
const stamp = (msAgo: number) => Timestamp.fromMillis(now - msAgo);

/* --------------------------------------------------------------- helpers -- */

const chaseRef = db.collection("chases").doc(CHASE_ID);

async function deleteCollection(path: string) {
  const snap = await db.collection(path).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

async function reset() {
  for (const sub of [
    "missions",
    "teams",
    "participants",
    "submissions",
    "adjustments",
    "broadcasts",
    "notifications",
    "reports",
  ]) {
    await deleteCollection(`chases/${CHASE_ID}/${sub}`);
  }
  await chaseRef.delete().catch(() => {});
  await db.collection("joinCodes").doc(JOIN_CODE).delete().catch(() => {});
  console.log("• cleared previous demo data");
}

/* ------------------------------------------------------------------ data -- */

const missions = [
  {
    id: "m-selfie",
    name: "סלפי קבוצתי במזרקה",
    description:
      "תכניסו את כל הקבוצה לפריים במזרקה בכיכר דיזנגוף. פוזה מסונכרנת שווה נקודות בונוס.",
    points: 200,
    type: "camera",
    feedVisibility: "shown",
    camera: { accepts: "photos", sources: "live_and_library", maxVideoSeconds: 30 },
    text: null,
    gps: null,
    release: { kind: "chase_start" },
    expiry: { kind: "chase_end" },
    isDraft: false,
    order: 0,
  },
  {
    id: "m-video",
    name: "תצלמו 20 שניות של אמן רחוב",
    description:
      "תמצאו אמן רחוב ותצלמו אותו — באישור שלו — עד 20 שניות. צילום חי בלבד, בלי גלריה.",
    points: 350,
    type: "camera",
    feedVisibility: "shown",
    camera: { accepts: "videos", sources: "live_only", maxVideoSeconds: 20 },
    text: null,
    gps: null,
    release: { kind: "chase_start" },
    expiry: { kind: "chase_end" },
    isDraft: false,
    order: 1,
  },
  {
    id: "m-trivia",
    name: "באיזו שנה נוסד מרכז באוהאוס?",
    description:
      "התשובה על השלט בכניסה. מספרים חייבים להיות מדויקים.",
    points: 150,
    type: "text",
    feedVisibility: "hidden",
    camera: null,
    text: { acceptedResponses: ["2000"], approximate: false },
    gps: null,
    release: { kind: "chase_start" },
    expiry: { kind: "chase_end" },
    isDraft: false,
    order: 2,
  },
  {
    id: "m-riddle",
    name: "איך קוראים לשוק?",
    description:
      "דוכני תבלינים, מיץ סחוט, ושם שמזכיר כרם. כתיב בערך נכון מספיק.",
    points: 175,
    type: "text",
    feedVisibility: "hidden",
    camera: null,
    text: {
      acceptedResponses: ["שוק הכרמל", "הכרמל"],
      approximate: true,
    },
    gps: null,
    release: { kind: "chase_start" },
    expiry: { kind: "chase_end" },
    isDraft: false,
    order: 3,
  },
  {
    id: "m-checkin",
    name: "צ'ק-אין בנמל הישן",
    description:
      "תגיעו לטיילת. הטלפון יאשר כשתהיו מספיק קרובים.",
    points: 250,
    type: "gps",
    feedVisibility: "shown",
    camera: null,
    text: null,
    gps: { lat: 32.0975, lng: 34.7742, radiusM: 250, address: "נמל תל אביב" },
    release: { kind: "chase_start" },
    expiry: { kind: "chase_end" },
    isDraft: false,
    order: 4,
  },
  {
    id: "m-combo",
    name: "חלק 2: תצלמו את מה שמצאתם",
    description:
      "נפתחת אחרי צ'ק-אין בנמל הישן. תצלמו את מה שהרמז הוביל אליו.",
    points: 300,
    type: "camera",
    feedVisibility: "shown",
    camera: { accepts: "both", sources: "live_and_library", maxVideoSeconds: 30 },
    text: null,
    gps: null,
    release: { kind: "mission", missionId: "m-checkin", requireCorrect: true },
    expiry: { kind: "chase_end" },
    isDraft: false,
    order: 5,
  },
  {
    id: "m-threshold",
    name: "פיינלה: אתגר ה-700 נקודות",
    description:
      "נפתחת כשהקבוצה מגיעה ל-700 נקודות. תצלמו את כולם קופצים ביחד.",
    points: 500,
    type: "camera",
    feedVisibility: "shown",
    camera: { accepts: "photos", sources: "live_and_library", maxVideoSeconds: 30 },
    text: null,
    gps: null,
    release: { kind: "points", points: 700 },
    expiry: { kind: "chase_end" },
    isDraft: false,
    order: 6,
  },
  {
    id: "m-draft",
    name: "שובר שוויון (טיוטה, עוד לא באוויר)",
    description: "מחכה בטיוטה עד שהמארגן יצטרך סיבוב הכרעה.",
    points: 400,
    type: "text",
    feedVisibility: "hidden",
    camera: null,
    text: { acceptedResponses: ["יפו"], approximate: true },
    gps: null,
    release: { kind: "chase_start" },
    expiry: { kind: "chase_end" },
    isDraft: true,
    order: 7,
  },
];

const teams = [
  { id: "t-falafel", name: "פלאפל מעופף", members: ["נועה", "אמיר", "יעל"] },
  { id: "t-sabich", name: "חבורת הסביח", members: ["טל", "רוני"] },
  { id: "t-shakshuka", name: "צוות שקשוקה", members: ["עומר"] },
];

/** [teamId, missionId, status, points, minutesAgo] */
const submissionPlan: Array<
  [string, string, "approved" | "rejected" | "pending", number, number]
> = [
  ["t-falafel", "m-selfie", "approved", 200, 95],
  ["t-falafel", "m-trivia", "approved", 150, 80],
  ["t-falafel", "m-riddle", "approved", 175, 62],
  ["t-falafel", "m-checkin", "approved", 250, 40],
  ["t-falafel", "m-combo", "pending", 0, 12],
  ["t-sabich", "m-selfie", "approved", 200, 88],
  ["t-sabich", "m-riddle", "approved", 175, 70],
  ["t-sabich", "m-trivia", "rejected", 0, 55],
  ["t-sabich", "m-video", "approved", 350, 25],
  ["t-shakshuka", "m-selfie", "approved", 200, 50],
];

/* ------------------------------------------------------------------ seed -- */

async function seed() {
  if (process.argv.includes("--reset")) await reset();

  await db.collection("users").doc(ORGANIZER.uid).set(
    {
      displayName: ORGANIZER.name,
      email: ORGANIZER.email,
      photoURL: null,
      isAnonymous: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await chaseRef.set({
    ownerUid: ORGANIZER.uid,
    workspaceId: null,
    collaborators: {},
    collaboratorEmails: [],
    name: "מרדף תל אביב",
    description:
      "ספרינט של שעתיים במרכז העיר. משימות צילום, טריוויה וצ'ק-אין.",
    imageUrl: null,
    location: { label: "תל אביב-יפו", lat: 32.0853, lng: 34.7818 },
    hasPassword: false,
    searchVisibility: "hidden",
    splashImageUrl: null,
    termsUrl: null,
    timezone: "Asia/Jerusalem",
    status: "live",
    startMode: "now",
    startAt,
    endAt,
    participantMode: "teams_or_solo",
    allowSelfCreatedTeams: true,
    maxTeamMembers: 5,
    missionOrder: "custom",
    leaderboardVisibility: "visible",
    leaderboardRevealed: true,
    moderationMode: "review",
    profanityFilter: true,
    collectEmails: false,
    joinCode: JOIN_CODE,
    stats: {
      teamCount: teams.length,
      participantCount: teams.reduce((n, t) => n + t.members.length, 0),
      submissionCount: submissionPlan.length,
      missionCount: missions.length,
    },
    createdAt: stamp(3 * HOUR),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await db.collection("joinCodes").doc(JOIN_CODE).set({ chaseId: CHASE_ID });

  for (const m of missions) {
    await chaseRef.collection("missions").doc(m.id).set({
      chaseId: CHASE_ID,
      name: m.name,
      description: m.description,
      points: m.points,
      type: m.type,
      imageUrl: null,
      linkUrl: null,
      feedVisibility: m.feedVisibility,
      isDraft: m.isDraft,
      order: m.order,
      camera: m.camera,
      text: m.text,
      gps: m.gps,
      release: m.release,
      expiry: m.expiry,
      createdAt: stamp(3 * HOUR),
      updatedAt: stamp(3 * HOUR),
    });
  }
  console.log(`• ${missions.length} missions`);

  const missionById = new Map(missions.map((m) => [m.id, m]));

  for (const team of teams) {
    await chaseRef.collection("teams").doc(team.id).set({
      chaseId: CHASE_ID,
      name: team.name,
      photoUrl: null,
      hasPasscode: false,
      mode: "team",
      maxMembers: 5,
      memberCount: team.members.length,
      createdBy: "participant",
      basePoints: 0,
      bonusPoints: 0,
      points: 0,
      submissionCount: 0,
      lastSubmissionAt: null,
      createdAt: stamp(2.5 * HOUR),
    });

    for (const [i, member] of team.members.entries()) {
      await chaseRef.collection("participants").doc(`${team.id}-p${i}`).set({
        chaseId: CHASE_ID,
        teamId: team.id,
        displayName: member,
        photoURL: null,
        email: null,
        submissionCount: 0,
        lastSubmissionAt: null,
        joinedAt: stamp(2.5 * HOUR),
      });
    }
  }
  console.log(`• ${teams.length} teams`);

  for (const [teamId, missionId, status, points, minsAgo] of submissionPlan) {
    const mission = missionById.get(missionId)!;
    const team = teams.find((t) => t.id === teamId)!;
    const createdAt = stamp(minsAgo * 60_000);
    await chaseRef
      .collection("submissions")
      .doc(`${teamId}--${missionId}`)
      .set({
        chaseId: CHASE_ID,
        missionId,
        missionName: mission.name,
        missionType: mission.type,
        teamId,
        teamName: team.name,
        participantUid: `${teamId}-p0`,
        participantName: team.members[0],
        status,
        caption:
          mission.type === "camera" ? "תפסנו בניסיון הראשון!" : null,
        media: null,
        textAnswer:
          mission.type === "text"
            ? status === "rejected"
              ? "1998"
              : (mission.text?.acceptedResponses[0] ?? null)
            : null,
        location:
          mission.type === "gps"
            ? { lat: 32.0977, lng: 34.7745, accuracyM: 12, distanceM: 34 }
            : null,
        points,
        bonusPoints: 0,
        autoGraded: mission.type !== "camera",
        gradeReason:
          mission.type === "text"
            ? status === "rejected"
              ? "לא בדיוק."
              : "בול."
            : mission.type === "gps"
              ? "צ'ק-אין מ-34 מ' מהיעד (בתוך 250 מ')."
              : null,
        likeCount: status === "approved" ? Math.floor(Math.random() * 6) : 0,
        feedVisible: mission.feedVisibility === "shown",
        hidden: false,
        flagged: false,
        flagReason: null,
        reviewedByUid: null,
        reviewedAt: null,
        reviewNote: null,
        createdAt,
      });
  }
  console.log(`• ${submissionPlan.length} submissions`);

  await chaseRef.collection("adjustments").doc("adj-1").set({
    chaseId: CHASE_ID,
    teamId: "t-falafel",
    submissionId: "t-falafel--m-selfie",
    points: 50,
    reason: "פוזה מסונכרנת ברמה אחרת",
    byUid: ORGANIZER.uid,
    byName: ORGANIZER.name,
    createdAt: stamp(70 * 60_000),
    editedAt: null,
  });
  await chaseRef.collection("adjustments").doc("adj-2").set({
    chaseId: CHASE_ID,
    teamId: "t-sabich",
    submissionId: null,
    points: -25,
    reason: "איחרו לתדריך",
    byUid: ORGANIZER.uid,
    byName: ORGANIZER.name,
    createdAt: stamp(45 * 60_000),
    editedAt: null,
  });
  console.log("• 2 score adjustments (one bonus, one penalty)");

  await chaseRef.collection("broadcasts").doc("b-welcome").set({
    chaseId: CHASE_ID,
    body: "ברוכים הבאים למרדף תל אביב! משימות נפתחות תוך כדי — תתחילו מהסלפי במזרקה.",
    imageUrl: null,
    linkUrl: null,
    teamIds: null,
    schedule: { kind: "at_start" },
    status: "sent",
    sentAt: startAt,
    createdByUid: ORGANIZER.uid,
    createdByName: ORGANIZER.name,
    createdAt: stamp(3 * HOUR),
  });
  await chaseRef.collection("broadcasts").doc("b-final").set({
    chaseId: CHASE_ID,
    body: "נשארה חצי שעה. תכניסו את ההגשות האחרונות!",
    imageUrl: null,
    linkUrl: null,
    teamIds: null,
    schedule: { kind: "during_relative", anchor: "end", offsetMs: -30 * 60_000 },
    status: "scheduled",
    sentAt: null,
    createdByUid: ORGANIZER.uid,
    createdByName: ORGANIZER.name,
    createdAt: stamp(3 * HOUR),
  });
  console.log("• 2 broadcasts (one sent, one scheduled)");

  // Recompute totals the same way the server does, so the leaderboard is real.
  for (const team of teams) {
    const [subs, adjs] = await Promise.all([
      chaseRef.collection("submissions").where("teamId", "==", team.id).get(),
      chaseRef.collection("adjustments").where("teamId", "==", team.id).get(),
    ]);
    let basePoints = 0;
    let lastSubmissionAt: Timestamp | null = null;
    for (const d of subs.docs) {
      const data = d.data();
      if (data.status !== "approved") continue;
      basePoints += Number(data.points ?? 0);
      const at = data.createdAt as Timestamp;
      if (!lastSubmissionAt || at.toMillis() > lastSubmissionAt.toMillis()) {
        lastSubmissionAt = at;
      }
    }
    const bonusPoints = adjs.docs.reduce(
      (n, d) => n + Number(d.data().points ?? 0),
      0,
    );
    await chaseRef.collection("teams").doc(team.id).update({
      basePoints,
      bonusPoints,
      points: basePoints + bonusPoints,
      submissionCount: subs.size,
      lastSubmissionAt,
    });
    console.log(
      `  – ${team.name}: ${basePoints} base ${bonusPoints >= 0 ? "+" : ""}${bonusPoints} bonus = ${basePoints + bonusPoints}`,
    );
  }

  // Best effort: give the demo organizer a real login if Auth is provisioned.
  try {
    await getAuth().getUser(ORGANIZER.uid);
  } catch {
    try {
      await getAuth().createUser({
        uid: ORGANIZER.uid,
        email: ORGANIZER.email,
        password: "chase-demo-2026",
        displayName: ORGANIZER.name,
      });
      console.log(`• auth user ${ORGANIZER.email} / chase-demo-2026`);
    } catch (error) {
      console.log(
        `• skipped auth user (${(error as Error).message.slice(0, 80)})`,
      );
    }
  }

  console.log(`\nDone. Chase id ${CHASE_ID}, join code ${JOIN_CODE}`);
}

seed().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
