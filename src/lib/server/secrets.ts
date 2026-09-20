import { FieldValue, type Transaction } from "firebase-admin/firestore";
import { chaseRef } from "./scoring";

/**
 * Join secrets live in `chases/{id}/private/settings`, never on the chase or
 * team documents: firestore.rules lets any signed-in user read a chase and
 * any member read a team, so a password stored there would be public. Only
 * organizers can read this document, and only the server ever writes it.
 */
export interface ChaseSecrets {
  password: string | null;
  /** teamId -> passcode. Absent means the team is open to anyone. */
  teamPasscodes: Record<string, string>;
}

const EMPTY: ChaseSecrets = { password: null, teamPasscodes: {} };

export const secretsRef = (chaseId: string) =>
  chaseRef(chaseId).collection("private").doc("settings");

function normalize(data: FirebaseFirestore.DocumentData | undefined): ChaseSecrets {
  if (!data) return { ...EMPTY };
  return {
    password: (data.password as string | null) ?? null,
    teamPasscodes: (data.teamPasscodes as Record<string, string>) ?? {},
  };
}

export async function loadSecrets(chaseId: string): Promise<ChaseSecrets> {
  const snap = await secretsRef(chaseId).get();
  return normalize(snap.data());
}

export async function loadSecretsTx(
  tx: Transaction,
  chaseId: string,
): Promise<ChaseSecrets> {
  const snap = await tx.get(secretsRef(chaseId));
  return normalize(snap.data());
}

export async function setChasePassword(chaseId: string, password: string | null) {
  await secretsRef(chaseId).set({ password: password || null }, { merge: true });
}

export async function setTeamPasscode(
  chaseId: string,
  teamId: string,
  passcode: string | null,
) {
  await secretsRef(chaseId).set(
    {
      teamPasscodes: {
        [teamId]: passcode ? passcode : FieldValue.delete(),
      },
    },
    { merge: true },
  );
}

/** Constant-time-ish comparison; these are short human codes, not hashes. */
export function matches(expected: string | null | undefined, given: string | undefined) {
  if (!expected) return true;
  return typeof given === "string" && given.trim() === expected.trim();
}
