/**
 * Reports whether the Storage bucket exists yet, and creates it if billing
 * has since been enabled. Used to confirm step 1 of SETUP.md is done.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

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
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

async function main() {
  const bucket = getStorage().bucket();
  const [exists] = await bucket.exists();
  if (exists) {
    const file = bucket.file("_healthcheck/ping.txt");
    await file.save("ok", { contentType: "text/plain" });
    await file.delete();
    console.log(`✓ Storage ready: ${bucket.name} (write/read verified)`);
    return;
  }
  console.log(`• bucket ${bucket.name} does not exist — attempting to create`);
  try {
    await bucket.create({ location: "US", storageClass: "STANDARD" });
    console.log(`✓ created ${bucket.name}`);
  } catch (error) {
    const message = (error as Error).message;
    if (/billing/i.test(message)) {
      console.log(
        "✗ Still on the Spark plan. Upgrade to Blaze first — see SETUP.md step 1.",
      );
      process.exitCode = 1;
      return;
    }
    console.log(`✗ ${message.slice(0, 200)}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
