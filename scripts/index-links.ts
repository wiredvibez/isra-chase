/**
 * Prints a one-click Firebase console link for every composite index the app
 * needs but the project does not have.
 *
 * `npm run deploy:indexes` is the proper route, but it needs an IAM role the
 * firebase-adminsdk service account is not granted. Firestore itself hands
 * back a console URL whenever a query is missing its index, so this runs each
 * required query, catches the failure, and collects those URLs.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Query } from "firebase-admin/firestore";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const env: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    env[t.slice(0, i)] = t.slice(i + 1);
  }
  return env;
}

const env = loadEnv();
const sa = JSON.parse(
  env.FIREBASE_SERVICE_ACCOUNT_KEY.trim().startsWith("{")
    ? env.FIREBASE_SERVICE_ACCOUNT_KEY
    : Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_KEY, "base64").toString("utf8"),
);

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: sa.private_key,
    }),
    projectId: sa.project_id,
  });
}

const db = getFirestore();
const CHASE = "demo-tel-aviv-chase";
const sub = (name: string) => db.collection("chases").doc(CHASE).collection(name);

/** Every composite query the UI actually issues. */
const QUERIES: Array<[string, Query]> = [
  [
    "feed — approved, visible submissions newest first",
    sub("submissions")
      .where("status", "==", "approved")
      .where("hidden", "==", false)
      .where("feedVisible", "==", true)
      .orderBy("createdAt", "desc"),
  ],
  [
    "a team's own submissions (the player's Me tab)",
    sub("submissions").where("teamId", "==", "t-falafel").orderBy("createdAt", "desc"),
  ],
  [
    "a mission's submissions (Studio, grouped by mission)",
    sub("submissions").where("missionId", "==", "m-selfie").orderBy("createdAt", "desc"),
  ],
  [
    "the review queue — pending submissions oldest first",
    sub("submissions").where("status", "==", "pending").orderBy("createdAt", "asc"),
  ],
  [
    "flagged submissions",
    sub("submissions").where("flagged", "==", true).orderBy("createdAt", "desc"),
  ],
  [
    "leaderboard — points desc, earliest to the total wins ties",
    sub("teams").orderBy("points", "desc").orderBy("lastSubmissionAt", "asc"),
  ],
  [
    "published missions in order",
    sub("missions").where("isDraft", "==", false).orderBy("order", "asc"),
  ],
  [
    "a team's notifications",
    sub("notifications").where("teamId", "==", "t-falafel").orderBy("createdAt", "desc"),
  ],
  [
    "sent broadcasts",
    sub("broadcasts").where("status", "==", "sent").orderBy("createdAt", "desc"),
  ],
  [
    "a team's bonus history",
    sub("adjustments").where("teamId", "==", "t-falafel").orderBy("createdAt", "desc"),
  ],
  [
    "open moderation reports",
    sub("reports").where("status", "==", "open").orderBy("createdAt", "desc"),
  ],
];

async function main() {
  const missing: Array<[string, string]> = [];
  let ok = 0;

  for (const [label, query] of QUERIES) {
    try {
      await query.get();
      ok += 1;
      console.log(`✓ ${label}`);
    } catch (error) {
      const message = String((error as Error).message);
      const url = message.match(/https:\/\/console\.firebase\.google\.com\/\S+/)?.[0];
      if (url) {
        missing.push([label, url.replace(/[.,)]+$/, "")]);
        console.log(`✗ ${label}`);
      } else {
        console.log(`? ${label} — ${message.slice(0, 120)}`);
      }
    }
  }

  console.log(`\n${ok} indexes present, ${missing.length} missing.`);
  if (missing.length) {
    console.log("\nOpen each link and press Create (they build in the background):\n");
    missing.forEach(([label, url], i) => {
      console.log(`${i + 1}. ${label}\n   ${url}\n`);
    });
    console.log(
      "Or, far quicker: run `firebase login` once, then\n" +
        "  firebase deploy --only firestore:indexes,storage --project isra-chase",
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
