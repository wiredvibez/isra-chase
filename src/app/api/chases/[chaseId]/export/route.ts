import { requireOrganizer } from "@/lib/server/guards";
import { badRequest, handler } from "@/lib/server/http";
import { exportResponse, slug, type ExportFormat, type Sheet } from "@/lib/server/export";
import { collectStats, type ChaseStats } from "@/lib/server/stats";

export const runtime = "nodejs";

type Params = { params: Promise<{ chaseId: string }> };

type Report = "participants" | "submissions" | "leaderboard";

const REPORTS: Report[] = ["participants", "submissions", "leaderboard"];
const FORMATS: ExportFormat[] = ["csv", "json", "xlsx"];

const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString());

function sheetFor(report: Report, stats: ChaseStats): Sheet {
  switch (report) {
    case "participants":
      return {
        name: "Participants",
        columns: [
          "Name", "Email", "Team", "Submissions", "Team points", "Joined", "Last submission",
        ],
        rows: stats.participants.map((row) => [
          row.displayName,
          row.email,
          row.teamName,
          row.submissions,
          row.teamPoints,
          iso(row.joinedAt),
          iso(row.lastSubmissionAt),
        ]),
      };
    case "submissions":
      return {
        name: "Submissions",
        columns: [
          "Mission", "Type", "Team", "Participant", "Status", "Points", "Bonus",
          "Answer", "Caption", "Distance (m)", "Media", "Likes", "Flagged",
          "Hidden", "Grade reason", "Submitted",
        ],
        rows: stats.submissions.map((row) => [
          row.missionName,
          row.missionType,
          row.teamName,
          row.participantName,
          row.status,
          row.points,
          row.bonusPoints,
          row.textAnswer,
          row.caption,
          row.distanceM,
          row.mediaUrl,
          row.likeCount,
          row.flagged,
          row.hidden,
          row.gradeReason,
          iso(row.createdAt),
        ]),
      };
    case "leaderboard":
      return {
        name: "Leaderboard",
        columns: [
          "Rank", "Team", "Points", "Base", "Bonus", "Submissions", "Members",
          "Tied", "Last submission",
        ],
        rows: stats.leaderboard.map((row) => [
          row.rank,
          row.name,
          row.points,
          row.basePoints,
          row.bonusPoints,
          row.submissions,
          row.members,
          row.tied,
          iso(row.lastSubmissionAt),
        ]),
      };
  }
}

/** Streams a real file download rather than JSON, so `handler()` is bypassed. */
export async function GET(request: Request, { params }: Params) {
  const { chaseId } = await params;
  const url = new URL(request.url);
  const report = (url.searchParams.get("report") ?? "submissions") as Report;
  const format = (url.searchParams.get("format") ?? "csv") as ExportFormat;

  // Errors still go through handler() so they come back as the usual JSON.
  if (!REPORTS.includes(report) || !FORMATS.includes(format)) {
    return handler(async () => {
      throw badRequest("Unknown report or format.");
    });
  }

  try {
    const { chase } = await requireOrganizer(chaseId, request);
    const stats = await collectStats(chaseId);
    return exportResponse(
      sheetFor(report, stats),
      format,
      `${slug(chase.name)}-${report}`,
    );
  } catch (error) {
    return handler(async () => {
      throw error;
    });
  }
}
