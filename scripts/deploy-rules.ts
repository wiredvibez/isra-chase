/**
 * Publishes firestore.rules (and storage.rules when a bucket exists) via the
 * Firebase Rules REST API.
 *
 * We bypass `firebase deploy` deliberately: its pre-flight calls
 * serviceusage.googleapis.com to confirm APIs are enabled, which the
 * firebase-adminsdk service account is not granted. Publishing a ruleset and
 * moving the release pointer only needs firebaserules scope, which it has.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { GoogleAuth } from "google-auth-library";

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
const PROJECT = sa.project_id;
const BUCKET = env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

const auth = new GoogleAuth({
  credentials: { client_email: sa.client_email, private_key: sa.private_key },
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

async function publish(file: string, releaseName: string) {
  const client = await auth.getClient();
  const source = readFileSync(resolve(process.cwd(), file), "utf8");

  const ruleset = await client.request<{ name: string }>({
    url: `https://firebaserules.googleapis.com/v1/projects/${PROJECT}/rulesets`,
    method: "POST",
    data: { source: { files: [{ name: file, content: source }] } },
  });
  const rulesetName = ruleset.data.name;

  const releasePath = `projects/${PROJECT}/releases/${releaseName}`;
  const body = { name: releasePath, rulesetName };

  // A release either does not exist yet (create) or must be repointed (update).
  try {
    await client.request({
      url: `https://firebaserules.googleapis.com/v1/projects/${PROJECT}/releases`,
      method: "POST",
      data: body,
    });
    console.log(`✓ ${file} → created release ${releaseName}`);
  } catch {
    await client.request({
      url: `https://firebaserules.googleapis.com/v1/${releasePath}`,
      method: "PATCH",
      data: { release: body },
    });
    console.log(`✓ ${file} → updated release ${releaseName}`);
  }
}

async function main() {
  await publish("firestore.rules", "cloud.firestore");
  try {
    await publish("storage.rules", `firebase.storage/${BUCKET}`);
  } catch (error) {
    const message = (error as { message?: string }).message ?? String(error);
    console.log(
      `• skipped storage.rules — ${message.slice(0, 120)}\n  (expected until the Storage bucket is created)`,
    );
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error?.response?.data ?? error);
    process.exit(1);
  },
);
