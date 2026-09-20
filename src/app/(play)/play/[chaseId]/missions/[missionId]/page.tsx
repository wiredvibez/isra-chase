import { MissionDetailView } from "@/components/play/mission-detail-view";

export default async function MissionDetailPage({
  params,
}: {
  params: Promise<{ chaseId: string; missionId: string }>;
}) {
  const { missionId } = await params;
  return <MissionDetailView missionId={missionId} />;
}
