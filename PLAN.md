# Isra Chase — build plan

A web clone of Goosechase: Next.js (App Router) + Firebase (Auth, Firestore,
Storage), deployed on Vercel.

Feature scope below is derived from research against goosechase.com,
support.goosechase.com and the Goosechase pricing matrix. Items marked
**[+]** are deliberate supersets of Goosechase (the brief asked for
"complete gameplay **and moderation**", and Goosechase ships no review
queue at all). Items marked **[skip]** are Goosechase features we are
consciously not building, with a reason.

---

## 1. Vocabulary

| Goosechase | Isra Chase | Notes |
|---|---|---|
| Experience | **Chase** | the game |
| Mission | **Mission** | kept |
| Flock / team | **Team** | kept |
| Studio | **Studio** | organizer console |
| Broadcast | **Broadcast** | one-way announcement |

---

## 2. Surfaces

1. **Marketing / landing** — public, explains the product, CTA to create or join.
2. **Auth** — email+password, Google, anonymous guest.
3. **Studio** (organizer) — dashboard → per-chase console with three sections
   and eight tabs, mirroring Goosechase's IA:
   - Create: Details · Missions · Branding · Broadcasts
   - Publish: Participants · Start & End
   - Review: Activity feed · Submissions · Leaderboard · Stats
4. **Play** (participant) — join, mission list, mission detail + submit,
   activity feed, leaderboard, team profile, notifications.

---

## 3. Data model (Firestore)

```
users/{uid}
workspaces/{workspaceId}                      members:{uid:'admin'|'member'}
chases/{chaseId}                              the Experience
  missions/{missionId}
  teams/{teamId}
  participants/{uid}
  submissions/{submissionId}
    likes/{uid}
  adjustments/{adjustmentId}                  bonus + manual score audit log
  broadcasts/{broadcastId}
  notifications/{notificationId}
  reports/{reportId}                          [+] participant-filed reports
joinCodes/{code} -> { chaseId }               top-level, unique
missionLibrary/{uid}/items/{itemId}           saved + previous missions
templates/{templateId}                        shareable chase templates
```

**Scoring is server-authoritative.** Firestore rules forbid clients writing
`points`, `status`, or any team total. Every scoring mutation (submit, grade,
delete, bonus, adjustment) runs in an Admin-SDK transaction inside a Next.js
route handler.

---

## 4. Missions

Three types, matching Goosechase exactly:

- **Camera** — `accepts`: photos / videos / both; `sources`: live capture and
  library, or **live capture only** (anti-cheat); video capped at 30 s.
  Always auto-approved (no correctness to check).
- **Text** — list of accepted responses (blank ⇒ open-ended, always accepted);
  **approximate matching** at ≥92% similarity, word-order-insensitive,
  plural-tolerant, with numbers requiring exact match. Badge per mission:
  `exact` / `approximate` / `open`. Auto-graded on submit.
- **GPS** — destination by address search, lat/long, or map click; radius from
  the exact eight-value set {25, 50, 100, 250, 500 m, 1, 2, 5 km}. Radius and
  pin hidden from participants. Auto-graded by haversine distance.

Shared mission fields: name, description, point value, optional attached image
(2:1) and link, and **feed visibility** (`shown` / `hidden`; text defaults to
hidden, camera to shown).

**Availability** (per mission):
- Release: at chase start (default) · relative to start/end · specific time ·
  when another mission is completed (optionally requiring a *correct* answer,
  which Camera cannot provide) · when the team reaches a point total.
- Expiry: at chase end (default) · relative · specific time.
- **Draft** toggle — built but invisible until enabled.
- Locked missions are entirely invisible, as are their submissions.
- Mission-unlock and timed release are mutually exclusive; unlock + expiry compose.

**Ordering** for participants: point value · alphabetical · random (per-team,
stable) · custom drag order. Participants see Remaining / Completed sections.

**Library & reuse**: duplicate a mission, save to library, insert from
"Previous missions" or "Saved missions".

---

## 5. Chase lifecycle

`draft → (scheduled) → live → ended`, plus **Reset start & end** which returns
an ended chase to draft while preserving participants, submissions and points.

- Start: now (Go Live) or at a specific time (Schedule).
- End: duration or specific datetime. **End time is mandatory to go live.**
- Timezone captured at creation and locked; participants always see local time.
- Everything is editable while live and applies immediately.
- **No pause** (parity — Goosechase has none).
- Duplicate a chase: copies missions + settings + availability, not
  participants or submissions.
- Share as template; copy from a template.

---

## 6. Teams & joining

- Participant mode: teams or individuals · teams only · individuals only ·
  organizer-managed only. Separate toggle for participant-created teams.
- Max members per team (or unlimited); solo profiles are single-device.
- Pre-created teams (name, photo, passcode, mode, max members) and
  participant-created teams.
- Joining by **QR code**, **invite link**, or **join code**; optional chase
  password; team passcode bypasses the chase password.
- Roster management: edit pre-created teams, remove a member (drops only that
  member's submissions and points), delete a team or participant.
- **[+] Organizer can move a participant between teams** — Goosechase
  explicitly cannot, and it is the single most-requested gap in their docs.

---

## 7. Points, leaderboard, moderation

- Base points on acceptance; **bonus points per submission** with an optional
  reason and **negative values allowed**; **manual per-team adjustments** with a
  **required** reason.
- **Bonus history per team is the audit log** — amount, reason, author,
  timestamp; entries editable and deletable.
- Ranking: points desc; tie broken by who reached the total first;
  **Olympic-style rank numbering** (three tied for 2nd ⇒ next is 5th).
- Leaderboard visibility: visible · hidden until revealed · hidden until the
  chase ends. When hidden, participants see only their own total.
- Deleting a submission removes its points automatically and notifies the team
  with the organizer's reason; the mission reopens for resubmission.

**Moderation — parity plus [+]:**
- Parity: auto-approval, delete-with-reason, bonus/penalty points, mission-level
  feed visibility, live-capture-only, chase password, hidden-from-search.
- **[+] Optional manual review mode** per chase: submissions land `pending`,
  and the Studio gets an approve / reject / request-resubmit queue with
  keyboard shortcuts and bulk actions. Off by default, so default behaviour
  matches Goosechase.
- **[+] Per-submission hide** (Goosechase can only hide a whole mission).
- **[+] Participant "report submission"** flow feeding a Studio reports queue.
- **[+] Profanity/blocklist screening** on captions and text answers, flagging
  rather than auto-deleting.

---

## 8. Communications

- **Broadcasts**: to everyone or to specific teams; scheduled for now · before
  start · at start · during (relative or specific) · at end · after end;
  All / Scheduled / Sent tabs; editable and deletable while scheduled.
  One-way, matching Goosechase.
- **Notifications** for: bonus points received, submission deleted (with
  reason), mission unlocked, broadcast received, and **[+]** moderation
  decisions.
- Due broadcasts are materialised lazily on read, so no always-on cron is
  required; a cron route is also exposed for exactness.

---

## 9. Stats & export

- Tiles: active teams · total teams · submissions · mission completion %.
- Charts: most popular missions · most engaged teams.
- Tables: participants and submissions, both exportable as **CSV / XLSX / JSON**.
- **Bulk media download** as a zip, grouped by team or by mission.

---

## 10. Deliberate non-goals

- **[skip] Native mobile apps** — the brief is web. The participant app is a
  mobile-first PWA with camera capture via `<input capture>`.
- **[skip] SSO / Clever login** — enterprise-only, needs an IdP we do not have.
- **[skip] Billing, plans and plan-gated limits** — no payment processor in
  scope; every feature is available.
- **[skip] AI mission generator** — out of scope for this build.
- **[skip] Email collection via support ticket** — replaced by a self-serve
  toggle, which is strictly better.

---

## 11. Build order

1. Domain types, Firestore rules + indexes, scoring engine, server API routes.
2. Auth pages and app shells.
3. Studio (8 tabs).
4. Play (participant app).
5. Marketing landing.
6. Seed script, unit tests for grading/scoring, Playwright E2E.
7. Push to GitHub, deploy to Vercel.
