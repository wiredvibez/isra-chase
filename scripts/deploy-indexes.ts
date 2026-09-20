/**
 * Creates the composite indexes in firestore.indexes.json through the
 * Firestore Admin REST API, for the same reason deploy-rules.ts exists: the
 * firebase CLI's pre-flight needs serviceusage permissions the service
 * account does not have.
 *
 * Index creation is asynchronous and idempotent — an index that already
 * exists returns ALREADY_EXISTS, which we treat as success.
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

interface IndexField {
  fieldPath: string;
  order?: "ASCENDING" | "DESCENDING";
  arrayConfig?: "CONTAINS";
}
interface IndexSpec {
  collectionGroup: string;
  queryScope: string;
  fields: IndexField[];
}

const env = loadEnv();
const sa = JSON.parse(
  env.FIREBASE_SERVICE_ACCOUNT_KEY.trim().startsWith("{")
    ? env.FIREBASE_SERVICE_ACCOUNT_KEY
    : Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_KEY, "base64").toString("utf8"),
);
const PROJECT = sa.project_id;
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/collectionGroups`;

const auth = new GoogleAuth({
  credentials: { client_email: sa.client_email, private_key: sa.private_key },
  scopes: ["https://www.googleapis.com/auth/datastore"],
});

async function main() {
  const spec = JSON.parse(
    readFileSync(resolve(process.cwd(), "firestore.indexes.json"), "utf8"),
  ) as { indexes: IndexSpec[] };
  const client = await auth.getClient();

  let created = 0;
  let existed = 0;
  let failed = 0;

  for (const index of spec.indexes) {
    const label = `${index.collectionGroup}(${index.fields
      .map((f) => `${f.fieldPath}${f.order === "DESCENDING" ? "↓" : f.arrayConfig ? "[]" : "↑"}`)
      .join(", ")})`;
    try {
      await client.request({
        url: `${BASE}/${index.collectionGroup}/indexes`,
        method: "POST",
        data: {
          queryScope: index.queryScope,
          fields: index.fields.map((f) =>
            f.arrayConfig
              ? { fieldPath: f.fieldPath, arrayConfig: f.arrayConfig }
              : { fieldPath: f.fieldPath, order: f.order },
          ),
        },
      });
      created += 1;
      console.log(`✓ creating ${label}`);
    } catch (error) {
      const err = error as { response?: { data?: { error?: { message?: string; status?: string } } } };
      const status = err.response?.data?.error?.status;
      const message = err.response?.data?.error?.message ?? "";
      if (status === "ALREADY_EXISTS" || /already exists/i.test(message)) {
        existed += 1;
        console.log(`• exists   ${label}`);
      } else {
        failed += 1;
        console.log(`✗ FAILED   ${label} — ${message.slice(0, 160)}`);
      }
    }
  }

  console.log(
    `\n${created} creating, ${existed} already present, ${failed} failed.` +
      (created ? " Index builds finish asynchronously." : ""),
  );
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error?.response?.data ?? error);
  process.exit(1);
});
