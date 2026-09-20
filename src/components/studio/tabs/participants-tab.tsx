"use client";

import * as React from "react";
import { toast } from "sonner";
import { ArrowLeftRight, Pencil, Plus, Trash2, UserMinus, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { SkeletonList } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { apiDelete, apiPatch, apiPost } from "@/lib/api-client";
import type { Chase, Participant, Team } from "@/lib/domain/types";
import { dateTime } from "@/lib/format";
import { useLoadedChase } from "../chase-context";
import { useParticipants, useTeams } from "../data-hooks";
import { Menu } from "../menu";
import { TeamEditor } from "../participants/team-editor";
import { SaveBar, useSaveState } from "../save-bar";
import { SettingRow, TabHeader } from "../section";
import {
  PARTICIPANT_MODE_HINT,
  PARTICIPANT_MODE_LABEL,
  toastError,
} from "../studio-utils";

interface SettingsForm {
  participantMode: Chase["participantMode"];
  allowSelfCreatedTeams: boolean;
  maxTeamMembers: string;
  missionOrder: Chase["missionOrder"];
}

function fromChase(chase: Chase): SettingsForm {
  return {
    participantMode: chase.participantMode ?? "teams_or_solo",
    allowSelfCreatedTeams: Boolean(chase.allowSelfCreatedTeams),
    maxTeamMembers: chase.maxTeamMembers ? String(chase.maxTeamMembers) : "",
    missionOrder: chase.missionOrder ?? "custom",
  };
}

export function ParticipantsTab() {
  const { chase, chaseId } = useLoadedChase();
  const { data: teams, loading: teamsLoading } = useTeams(chaseId);
  const { data: participants, loading: peopleLoading } = useParticipants(chaseId);

  const [form, setForm] = React.useState<SettingsForm>(() => fromChase(chase));
  const save = useSaveState();

  const [editingTeam, setEditingTeam] = React.useState<Team | null>(null);
  const [teamEditorOpen, setTeamEditorOpen] = React.useState(false);
  const [deleteTeam, setDeleteTeam] = React.useState<Team | null>(null);
  const [removePerson, setRemovePerson] = React.useState<Participant | null>(null);
  const [movePerson, setMovePerson] = React.useState<Participant | null>(null);
  const [moveTarget, setMoveTarget] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setForm(fromChase(chase));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaseId]);

  function set<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    save.markDirty();
  }

  async function saveSettings() {
    save.markSaving();
    try {
      await apiPatch(`/api/chases/${chaseId}`, {
        participantMode: form.participantMode,
        allowSelfCreatedTeams: form.allowSelfCreatedTeams,
        maxTeamMembers: form.maxTeamMembers ? Number(form.maxTeamMembers) : null,
        missionOrder: form.missionOrder,
      });
      save.markSaved();
    } catch (error) {
      save.markFailed();
      toastError(error, "Couldn't save those settings.");
    }
  }

  async function confirmDeleteTeam() {
    if (!deleteTeam) return;
    setBusy(true);
    try {
      await apiDelete(`/api/chases/${chaseId}/teams/${deleteTeam.id}`);
      toast.success("Team deleted.");
      setDeleteTeam(null);
    } catch (error) {
      toastError(error, "Couldn't delete that team.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmRemovePerson() {
    if (!removePerson) return;
    setBusy(true);
    try {
      await apiDelete(`/api/chases/${chaseId}/participants/${removePerson.uid}`);
      toast.success(`${removePerson.displayName} removed.`);
      setRemovePerson(null);
    } catch (error) {
      toastError(error, "Couldn't remove that participant.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmMove() {
    if (!movePerson || !moveTarget) return;
    setBusy(true);
    try {
      await apiPost(
        `/api/chases/${chaseId}/participants/${movePerson.uid}/move`,
        { teamId: moveTarget },
      );
      toast.success(`${movePerson.displayName} moved.`);
      setMovePerson(null);
      setMoveTarget("");
    } catch (error) {
      toastError(error, "Couldn't move that participant.");
    } finally {
      setBusy(false);
    }
  }

  const byTeam = React.useMemo(() => {
    const map = new Map<string, Participant[]>();
    for (const person of participants) {
      const list = map.get(person.teamId) ?? [];
      list.push(person);
      map.set(person.teamId, list);
    }
    return map;
  }, [participants]);

  const orphans = participants.filter(
    (person) => !teams.some((team) => team.id === person.teamId),
  );

  return (
    <div className="space-y-5">
      <TabHeader
        title="Participants"
        description="How people join, the teams they join, and who is on them."
        actions={
          <Button
            onClick={() => {
              setEditingTeam(null);
              setTeamEditorOpen(true);
            }}
          >
            <Plus className="size-4" aria-hidden />
            Pre-create team
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-5">
          <SettingRow
            label="Participant mode"
            hint={PARTICIPANT_MODE_HINT[form.participantMode]}
            htmlFor="participant-mode"
          >
            <Select
              id="participant-mode"
              value={form.participantMode}
              onChange={(e) =>
                set("participantMode", e.target.value as Chase["participantMode"])
              }
            >
              {(
                Object.keys(PARTICIPANT_MODE_LABEL) as Chase["participantMode"][]
              ).map((mode) => (
                <option key={mode} value={mode}>
                  {PARTICIPANT_MODE_LABEL[mode]}
                </option>
              ))}
            </Select>
          </SettingRow>

          <SettingRow label="Participant-created teams">
            <Switch
              checked={form.allowSelfCreatedTeams}
              onChange={(v) => set("allowSelfCreatedTeams", v)}
              label="Players can create their own teams"
              description="Turn this off to only allow the teams you pre-create."
            />
          </SettingRow>

          <SettingRow
            label="Max members per team"
            hint="Blank means unlimited."
            htmlFor="max-members"
          >
            <Input
              id="max-members"
              type="number"
              min={1}
              max={500}
              className="max-w-32"
              value={form.maxTeamMembers}
              onChange={(e) => set("maxTeamMembers", e.target.value)}
            />
          </SettingRow>

          <SettingRow
            label="Mission order"
            hint="How missions are sorted in the player app."
            htmlFor="mission-order"
          >
            <Select
              id="mission-order"
              value={form.missionOrder}
              onChange={(e) =>
                set("missionOrder", e.target.value as Chase["missionOrder"])
              }
            >
              <option value="custom">Custom — your drag order</option>
              <option value="points">Point value</option>
              <option value="alphabetical">Alphabetical</option>
              <option value="random">Random per team</option>
            </Select>
          </SettingRow>
        </CardContent>
      </Card>

      <SaveBar
        state={save.state}
        onSave={() => void saveSettings()}
        onDiscard={() => {
          setForm(fromChase(chase));
          save.markSaved();
        }}
      />

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">Roster</h2>

        {(teamsLoading || peopleLoading) && <SkeletonList rows={3} />}

        {!teamsLoading && !teams.length && (
          <EmptyState
            icon={<Users className="size-6" aria-hidden />}
            title="No teams yet"
            description="Pre-create teams now, or let players create their own when they join."
            action={
              <Button
                onClick={() => {
                  setEditingTeam(null);
                  setTeamEditorOpen(true);
                }}
              >
                <Plus className="size-4" aria-hidden />
                Pre-create a team
              </Button>
            }
          />
        )}

        <ul className="space-y-3">
          {teams.map((team) => {
            const members = byTeam.get(team.id) ?? [];
            return (
              <li key={team.id}>
                <Card>
                  <div className="flex items-center gap-3 border-b border-border p-4">
                    <Avatar name={team.name} src={team.photoUrl} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-base font-bold">
                        {team.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {members.length}{" "}
                        {members.length === 1 ? "member" : "members"}
                        {team.maxMembers ? ` of ${team.maxMembers}` : ""} ·{" "}
                        {team.points} pts
                      </p>
                    </div>
                    {team.mode === "solo" && <Badge tone="info">Solo</Badge>}
                    {team.createdBy === "organizer" && (
                      <Badge tone="neutral">Pre-created</Badge>
                    )}
                    <Menu
                      label={`Actions for ${team.name}`}
                      items={[
                        {
                          id: "edit",
                          label: "Edit team",
                          icon: <Pencil className="size-4" aria-hidden />,
                          onSelect: () => {
                            setEditingTeam(team);
                            setTeamEditorOpen(true);
                          },
                        },
                        {
                          id: "delete",
                          label: "Delete team",
                          icon: <Trash2 className="size-4" aria-hidden />,
                          tone: "danger",
                          onSelect: () => setDeleteTeam(team),
                        },
                      ]}
                    />
                  </div>

                  {members.length ? (
                    <ul className="divide-y divide-border">
                      {members.map((person) => (
                        <li
                          key={person.uid}
                          className="flex items-center gap-3 px-4 py-2"
                        >
                          <Avatar
                            name={person.displayName}
                            src={person.photoURL}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">
                              {person.displayName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Joined {dateTime(person.joinedAt)}
                              {person.email ? ` · ${person.email}` : ""}
                            </p>
                          </div>
                          <Menu
                            label={`Actions for ${person.displayName}`}
                            items={[
                              {
                                id: "move",
                                label: "Move to another team",
                                icon: (
                                  <ArrowLeftRight className="size-4" aria-hidden />
                                ),
                                onSelect: () => {
                                  setMovePerson(person);
                                  setMoveTarget(
                                    teams.find((t) => t.id !== person.teamId)?.id ??
                                      "",
                                  );
                                },
                              },
                              {
                                id: "remove",
                                label: "Remove from chase",
                                icon: <UserMinus className="size-4" aria-hidden />,
                                tone: "danger",
                                onSelect: () => setRemovePerson(person),
                              },
                            ]}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-4 py-3 text-sm text-muted-foreground">
                      Nobody has joined this team yet.
                    </p>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>

        {orphans.length > 0 && (
          <Card>
            <CardContent className="pt-5">
              <p className="mb-2 text-sm font-semibold">Without a team</p>
              <ul className="divide-y divide-border">
                {orphans.map((person) => (
                  <li key={person.uid} className="flex items-center gap-3 py-2">
                    <Avatar name={person.displayName} src={person.photoURL} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {person.displayName}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setMovePerson(person);
                        setMoveTarget(teams[0]?.id ?? "");
                      }}
                    >
                      Assign to a team
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>

      <TeamEditor
        chaseId={chaseId}
        team={editingTeam}
        open={teamEditorOpen}
        onClose={() => setTeamEditorOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(deleteTeam)}
        onClose={() => setDeleteTeam(null)}
        onConfirm={confirmDeleteTeam}
        loading={busy}
        title={`Delete “${deleteTeam?.name ?? ""}”?`}
        description={`Its ${byTeam.get(deleteTeam?.id ?? "")?.length ?? 0} member(s) are removed from the chase, and every submission and point this team earned is deleted. This cannot be undone.`}
        confirmLabel="Delete team"
      />

      <ConfirmDialog
        open={Boolean(removePerson)}
        onClose={() => setRemovePerson(null)}
        onConfirm={confirmRemovePerson}
        loading={busy}
        title={`Remove ${removePerson?.displayName ?? ""}?`}
        description="Their submissions are deleted and the points those earned come off their team's total. The team itself stays."
        confirmLabel="Remove participant"
      />

      {/* Moving a player between teams is our addition — Goosechase cannot do it. */}
      <Dialog
        open={Boolean(movePerson)}
        onClose={() => setMovePerson(null)}
        title="Move to another team"
        description={`${movePerson?.displayName ?? ""} keeps their submissions; the points move with them to the new team.`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setMovePerson(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => void confirmMove()}
              loading={busy}
              disabled={!moveTarget}
            >
              Move participant
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <label htmlFor="move-target" className="text-sm font-semibold">
            New team
          </label>
          <Select
            id="move-target"
            value={moveTarget}
            onChange={(e) => setMoveTarget(e.target.value)}
          >
            <option value="">Choose a team…</option>
            {teams
              .filter((team) => team.id !== movePerson?.teamId)
              .map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
          </Select>
          <Badge tone="accent">Beyond Goosechase</Badge>
        </div>
      </Dialog>
    </div>
  );
}
