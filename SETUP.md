# Isra Chase — setup

## What already works

The Firebase project `isra-chase` is live and reachable with the Admin SDK:

- **Firestore** — provisioned, seeded, and the security rules in
  `firestore.rules` are published.
- **Admin SDK** — verified with a real write/read/delete round trip.

## What still needs a human

These three steps need console access or an interactive login, and each one
is called out below with exactly what it unblocks.

### 1. Upgrade the Firebase project to Blaze  → unblocks photo/video uploads

Storage cannot be provisioned on the Spark plan. Attempting it returns
`The billing account for the owning project is disabled in state absent`.

1. Open <https://console.firebase.google.com/project/isra-chase/usage/details>
2. Upgrade to **Blaze (pay as you go)**. Normal usage for this app sits inside
   the free allowance; a card just has to be on file.
3. Then Build → **Storage** → **Get started** (accept the default rules; ours
   overwrite them in step 4).

### 2. Enable the auth providers  → unblocks sign-in

Authentication has never been initialised on this project, so every provider
is off. Programmatic setup needs Identity Platform, which itself needs Blaze,
so do this in the console:

1. Open <https://console.firebase.google.com/project/isra-chase/authentication/providers>
2. Click **Get started**, then enable:
   - **Email/Password**
   - **Google**
   - **Anonymous** (this is what lets players join as guests without an account)
3. Once the app is deployed, add the Vercel domain under
   Authentication → Settings → **Authorized domains**.

### 3. Create the composite indexes  → unblocks the feed, leaderboard and notifications

**This is the last functional gap.** Without these indexes the activity feed,
the leaderboard, a team's own submission history and the notifications list
all come back empty, because the query fails rather than returning nothing.

Fastest route — one command, then one deploy:

```
firebase login
firebase deploy --only firestore:indexes,storage --project isra-chase
```

If you would rather not log in, `npm run index:links` prints a one-click
Firebase console link for every index that is still missing, with a plain
description of what each one is for.

### 3b. Or grant the service account index permissions

`npm run deploy:indexes` currently fails with *The caller does not have
permission*. The `firebase-adminsdk` service account can read and write data
but cannot administer indexes. Either:

**Option A — grant the role** (then `npm run deploy:indexes` just works):

```
gcloud projects add-iam-policy-binding isra-chase \
  --member=serviceAccount:firebase-adminsdk-fbsvc@isra-chase.iam.gserviceaccount.com \
  --role=roles/datastore.indexAdmin
```

**Option B — deploy as yourself:**

```
firebase login
firebase deploy --only firestore:indexes,storage --project isra-chase
```

Until the indexes exist, any query that needs one fails with a Firestore error
containing a one-click console link to create it.

### 4. Publish the Storage rules (after step 1)

```
npm run deploy:rules
```

This publishes `firestore.rules` every time and `storage.rules` as soon as the
bucket exists.

---

## Local development

```bash
npm install
cp .env.example .env.local     # already populated on this machine
npm run dev
```

`.env.local` holds the Firebase web config plus
`FIREBASE_SERVICE_ACCOUNT_KEY` as base64. It is gitignored and the key itself
lives outside the repo at `~/.secrets/`.

Useful scripts:

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run seed -- --reset` | rebuild the demo chase (join code `TLV24X`) |
| `npm run deploy:rules` | publish Firestore + Storage rules |
| `npm run deploy:indexes` | create composite indexes |
| `npm test` | unit tests (grading, availability, ranking) |
| `npm run e2e` | Playwright end-to-end tests |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run emulators` | Firebase emulator suite |

To develop against the emulators instead of the live project, set
`NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` in `.env.local` and run
`npm run emulators` alongside `npm run dev`.

---

## Vercel

The project deploys from `main`. Environment variables that must exist in
Vercel (Production, Preview and Development):

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | from the Firebase web config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `isra-chase` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | the service-account JSON, base64-encoded, on one line |
| `NEXT_PUBLIC_APP_URL` | the deployed origin |

After the first deploy, add the Vercel domain to Firebase's authorized
domains (step 2 above) or Google sign-in will be rejected.
