/**
 * Deliberately small blocklist. Goosechase has no filter at all, so this is a
 * superset feature: it flags for the organizer's review queue rather than
 * deleting, because false positives on user content are far more damaging
 * than a slur reaching a moderator's screen one minute early.
 */
const BLOCKLIST = [
  "anal", "arse", "asshole", "bastard", "bitch", "bollocks", "boner",
  "bullshit", "clit", "cock", "cocksucker", "cnut", "cunt", "dickhead",
  "dildo", "douchebag", "dyke", "fag", "faggot", "fuck", "fucker", "fucking",
  "goddamn", "handjob", "jerkoff", "jizz", "kike", "motherfucker", "nigga",
  "nigger", "paki", "pussy", "retard", "rimjob", "shit", "shithead", "slut",
  "spastic", "spic", "tits", "titties", "twat", "wanker", "whore",
];

/** Leet-speak folded to letters so "sh1t" and "f u c k" do not slip through. */
function fold(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[0@]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t")
    .replace(/[^a-z]+/g, " ");
}

const WORDS = new Set(BLOCKLIST);

/**
 * Returns the first blocked term found, or null. Matching is whole-word after
 * folding, so "Scunthorpe" and "assassin" stay clean; runs of single letters
 * are also joined up first, which catches "f u c k" without re-introducing
 * the substring false positives that a blanket squash would.
 */
export function screen(...inputs: (string | null | undefined)[]): string | null {
  for (const input of inputs) {
    if (!input) continue;
    const words = fold(input).split(" ").filter(Boolean);

    let run = "";
    for (const word of words) {
      if (WORDS.has(word)) return word;
      if (word.length === 1) {
        run += word;
        if (WORDS.has(run)) return run;
      } else {
        run = "";
      }
    }
  }
  return null;
}

export function flagFor(term: string): string {
  return `Contains blocked language ("${term}").`;
}
