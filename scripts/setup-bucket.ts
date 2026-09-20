/**
 * Provisions the media bucket the app uploads to.
 *
 * We do NOT use Firebase Storage: provisioning it requires enabling the
 * Cloud Storage for Firebase API, which needs a console click the
 * firebase-adminsdk service account has no permission to perform. A plain GCS
 * bucket needs none of that, and browsers upload straight to it with a V4
 * signed URL minted by /api/uploads/sign.
 *
 *   npm run setup:bucket
 *
 * Safe to re-run.
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

const BUCKET = env.MEDIA_BUCKET || `${sa.project_id}-media`;
const ORIGINS = [
  env.NEXT_PUBLIC_APP_URL,
  "https://isra-chase.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
].filter(Boolean) as string[];

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: sa.private_key,
    }),
    storageBucket: BUCKET,
  });
}

async function main() {
  const bucket = getStorage().bucket();

  const [exists] = await bucket.exists();
  if (!exists) {
    await bucket.create({ location: "EUROPE-WEST1", storageClass: "STANDARD" });
    console.log(`✓ created ${BUCKET}`);
  } else {
    console.log(`• ${BUCKET} already exists`);
  }

  // Browsers PUT directly to the bucket, so it needs its own CORS policy;
  // the app's own CORS headers never enter into it.
  await bucket.setCorsConfiguration([
    {
      origin: [...new Set(ORIGINS)],
      method: ["GET", "PUT", "HEAD"],
      // x-goog-acl must be allowed as a REQUEST header: the browser sends it
      // with the PUT so the object is public the moment it is created.
      responseHeader: [
        "Content-Type",
        "Content-Length",
        "Content-Disposition",
        "x-goog-acl",
      ],
      maxAgeSeconds: 3600,
    },
  ]);
  console.log(`✓ CORS allows ${[...new Set(ORIGINS)].join(", ")}`);

  // Uniform bucket-level access must stay OFF so per-object ACLs work: the
  // signed upload URL carries x-goog-acl: public-read, which makes each object
  // readable at creation without a second server round trip. The service
  // account cannot set a bucket-wide IAM policy, so this is the available
  // route — and it is also the narrower one, since nothing is public by
  // default. Paths carry a random segment so they are not enumerable, the same
  // bargain Firebase Storage's tokenised download URLs make.
  await bucket.setMetadata({
    iamConfiguration: { uniformBucketLevelAccess: { enabled: false } },
  });
  console.log("✓ uniform access off, per-object ACLs available");

  const probe = bucket.file(`_healthcheck/${Date.now()}.txt`);
  await probe.save("ok", { contentType: "text/plain" });
  await probe.makePublic();
  const url = `https://storage.googleapis.com/${BUCKET}/${probe.name}`;
  const res = await fetch(url);
  console.log(`✓ public read ${res.status === 200 ? "works" : `FAILED (${res.status})`}: ${url}`);
  await probe.delete();

  console.log(`\nSet MEDIA_BUCKET=${BUCKET} in .env.local and in Vercel.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
