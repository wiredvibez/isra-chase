# Isra Chase

A web platform for running scavenger hunts — a clone of
[Goosechase](https://goosechase.com), built with Next.js, Firebase and Vercel.

Organizers build missions, share a join code, and watch submissions land on a
live feed while a leaderboard updates itself. Players join from a phone
browser with no app install, shoot photos and video, answer trivia, and check
in at GPS locations.

---

## What it does

**Three mission types**, matching Goosechase exactly:

| Type | Configuration | Grading |
|---|---|---|
| **Camera** | photos / videos / both; live capture only or camera roll too; 30 s video cap | always accepted |
| **Text** | a list of accepted answers, or open-ended | exact, or approximate at ≥92% similarity — word-order insensitive, plural tolerant, digits exact |
| **GPS** | a pin and one of eight radii (25 m – 5 km) | haversine distance, radius never revealed to players |

**Availability rules** per mission — release at chase start, at a relative or
absolute time, when another mission is completed (optionally requiring a
*correct* answer), or when a team crosses a point threshold. Locked missions
are entirely invisible, and re-lock if the unlocking submission is deleted.
Expiry works the same way. Missions can be staged as drafts.

**Scoring** is server-authoritative. Base points on approval, bonus points per
submission (negative values are the penalty mechanism), and manual per-team
adjustments with a required reason. Every change lands in a per-team audit log
with author and timestamp. Ranking is points-descending, tie-broken by whoever
reached the total first, with Olympic place numbering.

**Moderation** covers Goosechase parity — delete with a reason that reaches
the player, mission-level feed visibility, live-capture-only missions, chase
passwords — plus additions Goosechase does not have: an optional manual review
queue, per-submission hide, participant-filed reports, and a profanity flag.

**Communication**: one-way broadcasts to everyone or to specific teams,
schedulable relative to the chase start or end, plus in-app notifications for
bonus points, deletions, unlocks and broadcasts.

See [`PLAN.md`](./PLAN.md) for the full researched feature set, the deliberate
supersets, the non-goals, and the known limitations.

---

## Architecture

```
Next.js 16 App Router
├─ (marketing)   public landing + auth
├─ (studio)      organizer console — Create / Publish / Review, 8 tabs
├─ (play)        participant PWA — missions, feed, leaderboard, team
└─ api/          route handlers, Node runtime, Firebase Admin SDK

Firebase
├─ Auth          email+password, Google, anonymous guests
├─ Firestore     chases › missions | teams | participants | submissions
│                       | adjustments | broadcasts | notifications | reports
└─ Storage       submission media, team and chase artwork
```

**Writes are server-only.** The security rules give clients no write access to
game data at all — the single exception is a user's own profile document.
Every scoring mutation runs in an Admin SDK transaction inside a route
handler, so a point total cannot be forged or left half-applied.

**Missions are never readable by players.** They hold the text answer key and
the GPS target, so participants receive an availability-resolved,
secret-stripped projection from the API instead. This is asserted in the rule
tests.

Reads are live: the feed, leaderboard, teams and notifications are Firestore
`onSnapshot` subscriptions, so no polling and no websocket server.

---

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the Firebase web config + service account
npm run dev
```

See [`SETUP.md`](./SETUP.md) for Firebase project setup, including the steps
that need console access.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | production build |
| `npm test` | unit tests — grading, availability, ranking |
| `npm run test:rules` | security-rule tests (needs the emulator) |
| `npm run e2e` | Playwright end-to-end tests (needs the emulator) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run emulators` | Firebase emulator suite |
| `npm run seed -- --reset` | rebuild the demo chase |
| `npm run deploy:rules` | publish Firestore + Storage rules |
| `npm run deploy:indexes` | create composite indexes |

### Testing against emulators

The test suites run entirely against the Firebase emulator suite — no billing,
no live project, no credentials:

```bash
npm run emulators          # terminal 1
npm run test:rules         # terminal 2
npm run e2e
```

The emulators need a Java runtime. If `java -version` fails, install a JRE
(Temurin 21 works) and export `JAVA_HOME`.

---

## Testing

| Suite | Covers |
|---|---|
| `src/lib/domain/*.test.ts` | fuzzy text matching and its false-positive floor, digit-exactness, haversine check-ins, availability gating and the re-lock machine, Olympic ranking and tie-breaks |
| `tests/rules.test.ts` | that clients cannot read the answer key or write points, and that feed visibility holds for hidden missions, hidden submissions and pending submissions |
| `e2e/` | the organizer and player journeys end to end in a real browser |

---

## Licence and attribution

Isra Chase is an independent reimplementation built for learning. It is not
affiliated with, endorsed by, or connected to Goosechase. No Goosechase code,
artwork, branding or copy is used — the feature set was derived from their
public documentation, and all naming, design and implementation here are
original.
