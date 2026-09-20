import { z } from "zod";
import { GPS_RADII } from "./types";

/* ------------------------------------------------------------- primitives */

export const missionTypeSchema = z.enum(["camera", "text", "gps"]);
export const gpsRadiusSchema = z.union(
  GPS_RADII.map((r) => z.literal(r)) as unknown as [
    z.ZodLiteral<number>,
    z.ZodLiteral<number>,
    ...z.ZodLiteral<number>[],
  ],
);

export const releaseRuleSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("chase_start") }),
  z.object({
    kind: z.literal("relative"),
    anchor: z.enum(["start", "end"]),
    offsetMs: z.number().int(),
  }),
  z.object({ kind: z.literal("specific"), atMs: z.number().int().positive() }),
  z.object({
    kind: z.literal("mission"),
    missionId: z.string().min(1),
    requireCorrect: z.boolean(),
  }),
  z.object({ kind: z.literal("points"), points: z.number().int().min(1) }),
]);

export const expiryRuleSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("chase_end") }),
  z.object({
    kind: z.literal("relative"),
    anchor: z.enum(["start", "end"]),
    offsetMs: z.number().int(),
  }),
  z.object({ kind: z.literal("specific"), atMs: z.number().int().positive() }),
]);

/* ----------------------------------------------------------------- chases */

export const createChaseSchema = z.object({
  name: z.string().trim().min(1, "Give your chase a name.").max(120),
  description: z.string().trim().max(200).default(""),
  timezone: z.string().min(1),
});

export const updateChaseSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(200).optional(),
  imageUrl: z.string().url().nullable().optional(),
  location: z
    .object({ label: z.string(), lat: z.number(), lng: z.number() })
    .nullable()
    .optional(),
  password: z.string().trim().max(64).nullable().optional(),
  searchVisibility: z.enum(["hidden", "public"]).optional(),
  splashImageUrl: z.string().url().nullable().optional(),
  termsUrl: z.string().url().nullable().optional(),
  participantMode: z
    .enum(["teams_or_solo", "teams_only", "solo_only", "organizer_managed"])
    .optional(),
  allowSelfCreatedTeams: z.boolean().optional(),
  maxTeamMembers: z.number().int().min(1).max(500).nullable().optional(),
  missionOrder: z.enum(["points", "alphabetical", "random", "custom"]).optional(),
  leaderboardVisibility: z
    .enum(["visible", "hidden_until_reveal", "hidden_until_end"])
    .optional(),
  leaderboardRevealed: z.boolean().optional(),
  moderationMode: z.enum(["auto", "review"]).optional(),
  profanityFilter: z.boolean().optional(),
  collectEmails: z.boolean().optional(),
});

export const chaseScheduleSchema = z
  .object({
    action: z.enum(["go_live", "schedule", "end", "reset", "update_end"]),
    startAtMs: z.number().int().positive().nullable().optional(),
    endAtMs: z.number().int().positive().nullable().optional(),
  })
  .refine(
    (v) => v.action !== "go_live" || Boolean(v.endAtMs),
    { message: "A chase needs an end time before it can go live.", path: ["endAtMs"] },
  )
  .refine(
    (v) => v.action !== "schedule" || (Boolean(v.startAtMs) && Boolean(v.endAtMs)),
    { message: "Scheduling needs both a start and an end time.", path: ["startAtMs"] },
  );

/* --------------------------------------------------------------- missions */

export const missionInputSchema = z
  .object({
    name: z.string().trim().min(1, "Missions need a name.").max(120),
    description: z.string().trim().min(1, "Missions need a description.").max(4000),
    points: z.number().int().min(0).max(1_000_000),
    type: missionTypeSchema,
    imageUrl: z.string().url().nullable().default(null),
    linkUrl: z.string().url().nullable().default(null),
    feedVisibility: z.enum(["shown", "hidden"]),
    isDraft: z.boolean().default(false),
    camera: z
      .object({
        accepts: z.enum(["photos", "videos", "both"]),
        sources: z.enum(["live_and_library", "live_only"]),
        maxVideoSeconds: z.number().int().min(1).max(300).default(30),
      })
      .nullable()
      .default(null),
    text: z
      .object({
        acceptedResponses: z.array(z.string().trim()).max(100).default([]),
        approximate: z.boolean().default(false),
      })
      .nullable()
      .default(null),
    gps: z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        radiusM: gpsRadiusSchema,
        address: z.string().nullable().default(null),
      })
      .nullable()
      .default(null),
    release: releaseRuleSchema.default({ kind: "chase_start" }),
    expiry: expiryRuleSchema.default({ kind: "chase_end" }),
  })
  .superRefine((value, ctx) => {
    // Each type must carry exactly its own config block.
    if (value.type === "camera" && !value.camera) {
      ctx.addIssue({ code: "custom", path: ["camera"], message: "Camera settings are required." });
    }
    if (value.type === "text" && !value.text) {
      ctx.addIssue({ code: "custom", path: ["text"], message: "Text settings are required." });
    }
    if (value.type === "gps" && !value.gps) {
      ctx.addIssue({ code: "custom", path: ["gps"], message: "Pick a location for this mission." });
    }
    // Whether an unlock may require a *correct* answer depends on the TRIGGER
    // mission's type, not this one's, so it cannot be checked here — the route
    // handler loads the trigger and validates it (see assertTriggerCanGrade).
  });

export const reorderMissionsSchema = z.object({
  order: z.array(z.string().min(1)).min(1),
});

/* ------------------------------------------------------------------ teams */

export const createTeamSchema = z.object({
  name: z.string().trim().min(1, "Teams need a name.").max(60),
  photoUrl: z.string().url().nullable().default(null),
  passcode: z.string().trim().max(32).nullable().default(null),
  mode: z.enum(["team", "solo"]).default("team"),
  maxMembers: z.number().int().min(1).max(500).nullable().default(null),
});

export const updateTeamSchema = createTeamSchema.partial();

export const joinChaseSchema = z.object({
  code: z.string().trim().min(1).max(32).optional(),
  chaseId: z.string().min(1).optional(),
  chasePassword: z.string().trim().max(64).optional(),
  displayName: z.string().trim().min(1, "Pick a display name.").max(60),
  photoURL: z.string().url().nullable().optional(),
  email: z.string().email().nullable().optional(),
  /** Join an existing team… */
  teamId: z.string().min(1).optional(),
  teamPasscode: z.string().trim().max(32).optional(),
  /** …or create one. */
  newTeam: createTeamSchema.partial({ photoUrl: true, passcode: true, maxMembers: true }).optional(),
});

export const moveParticipantSchema = z.object({
  teamId: z.string().min(1),
});

/* ------------------------------------------------------------ submissions */

export const mediaSchema = z.object({
  url: z.string().url(),
  path: z.string().min(1),
  kind: z.enum(["image", "video", "audio"]),
  contentType: z.string().min(1),
  bytes: z.number().int().nonnegative(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationSec: z.number().nonnegative().optional(),
});

export const createSubmissionSchema = z.object({
  missionId: z.string().min(1),
  caption: z.string().trim().max(500).nullable().default(null),
  media: mediaSchema.nullable().default(null),
  textAnswer: z.string().trim().max(2000).nullable().default(null),
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      accuracyM: z.number().nonnegative().nullable().default(null),
    })
    .nullable()
    .default(null),
});

export const moderateSubmissionSchema = z.object({
  action: z.enum(["approve", "reject", "hide", "unhide", "flag", "unflag"]),
  note: z.string().trim().max(500).nullable().default(null),
});

export const deleteSubmissionSchema = z.object({
  reason: z.string().trim().max(500).nullable().default(null),
});

export const bonusSchema = z.object({
  points: z.number().int().refine((n) => n !== 0, "Bonus can't be zero."),
  reason: z.string().trim().max(300).nullable().default(null),
});

export const reportSubmissionSchema = z.object({
  reason: z.string().trim().min(1, "Tell us what's wrong.").max(500),
});

/* ------------------------------------------------------------ adjustments */

export const adjustmentSchema = z.object({
  teamId: z.string().min(1),
  points: z.number().int().refine((n) => n !== 0, "Adjustment can't be zero."),
  reason: z.string().trim().min(1, "Score adjustments need a reason."),
});

export const updateAdjustmentSchema = z.object({
  points: z.number().int().optional(),
  reason: z.string().trim().min(1).optional(),
});

/* ------------------------------------------------------------- broadcasts */

export const broadcastScheduleSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("now") }),
  z.object({ kind: z.literal("before_start"), offsetMs: z.number().int().positive() }),
  z.object({ kind: z.literal("at_start") }),
  z.object({
    kind: z.literal("during_relative"),
    anchor: z.enum(["start", "end"]),
    offsetMs: z.number().int(),
  }),
  z.object({ kind: z.literal("during_specific"), atMs: z.number().int().positive() }),
  z.object({ kind: z.literal("at_end") }),
  z.object({ kind: z.literal("after_end"), offsetMs: z.number().int().positive() }),
]);

export const broadcastSchema = z.object({
  body: z.string().trim().min(1, "Write something to send.").max(2000),
  imageUrl: z.string().url().nullable().default(null),
  linkUrl: z.string().url().nullable().default(null),
  teamIds: z.array(z.string().min(1)).nullable().default(null),
  schedule: broadcastScheduleSchema.default({ kind: "now" }),
});

/* ----------------------------------------------------------- collaborators */

export const collaboratorSchema = z.object({
  email: z.string().email("That doesn't look like an email address."),
});

export type CreateChaseInput = z.infer<typeof createChaseSchema>;
export type UpdateChaseInput = z.infer<typeof updateChaseSchema>;
export type MissionInput = z.infer<typeof missionInputSchema>;
export type JoinChaseInput = z.infer<typeof joinChaseSchema>;
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type BroadcastInput = z.infer<typeof broadcastSchema>;
