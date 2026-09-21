import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync(".env.local","utf8").split("\n")
  .filter(l=>l.includes("=")&&!l.startsWith("#")).map(l=>[l.slice(0,l.indexOf("=")),l.slice(l.indexOf("=")+1)]));
const sa = JSON.parse(Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_KEY,"base64").toString("utf8"));
const { initializeApp, cert } = await import("firebase-admin/app");
const { getStorage } = await import("firebase-admin/storage");
const bucket = getStorage(initializeApp({ credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }), storageBucket: env.MEDIA_BUCKET })).bucket();

const src = "chases/WVqsY0tMbpRyACW3nikr/submissions/q7pojYDZRncAsOvADT8k7WjmtU32/FR5TYIy1ba25O5YsRUA2-1789983655506.mov";
const [buf] = await bucket.file(src).download();
console.log("downloaded", buf.length, "bytes");

// What codecs are inside? Look for ISO-BMFF brand and codec atoms.
const head = buf.subarray(0, 4096).toString("latin1");
const brand = buf.subarray(8, 12).toString("latin1");
console.log("ftyp brand:", JSON.stringify(brand));
for (const tag of ["hvc1", "hev1", "avc1", "mp4a", "ac-3", "sowt", "twos", "alac"]) {
  if (head.includes(tag)) console.log("  contains codec atom:", tag);
}
// Wider scan for audio track handler
const whole = buf.toString("latin1");
for (const tag of ["hvc1", "hev1", "avc1", "mp4a", "soun", "vide"]) {
  const n = whole.split(tag).length - 1;
  if (n) console.log(`  atom ${tag} x${n}`);
}

// Publish the same bytes twice, under the two content types, for a browser A/B.
for (const [name, type] of [["probe/as-quicktime.mov", "video/quicktime"], ["probe/as-mp4.mp4", "video/mp4"]]) {
  const f = bucket.file(name);
  await f.save(buf, { contentType: type, resumable: false });
  await f.makePublic();
  console.log(`published ${name} as ${type}`);
}
console.log(`https://storage.googleapis.com/${env.MEDIA_BUCKET}/probe/as-quicktime.mov`);
console.log(`https://storage.googleapis.com/${env.MEDIA_BUCKET}/probe/as-mp4.mp4`);
