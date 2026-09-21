/**
 * Does this video actually carry an audio track?
 *
 * A phone can hand us a perfectly valid clip with no sound in it — a
 * time-lapse and a slow-mo recording have no audio track at all, and a
 * screen recording often does not either. Shipping one of those to a mission
 * silently is the bug this exists to prevent: the player believes they filmed
 * sound, and the organizer judging it hears nothing.
 *
 * The DOM cannot answer this reliably. `HTMLMediaElement.audioTracks` is
 * unimplemented in Chromium without a flag, and
 * `webkitAudioDecodedByteCount` only moves once playback has actually decoded
 * audio, which means playing the clip first. So we read the container instead,
 * which is deterministic and needs only the first slice of the file.
 */

/** Read just enough of the file; moov/Tracks live near the start or the end. */
const HEAD_BYTES = 2 * 1024 * 1024;
const TAIL_BYTES = 2 * 1024 * 1024;

export type AudioTrackVerdict = "present" | "absent" | "unknown";

/* ------------------------------------------------------- ISO-BMFF (mp4/mov) */

const BOXES_WITH_CHILDREN = new Set([
  "moov",
  "trak",
  "mdia",
  "minf",
  "stbl",
  "edts",
  "udta",
  "moof",
  "traf",
]);

/**
 * Walk the box tree looking for a media handler of type `soun`.
 * Returns null when the tree was truncated before any handler was found, so
 * the caller can say "unknown" rather than "absent".
 */
function findSounHandler(
  view: DataView,
  start: number,
  end: number,
  depth = 0,
): boolean | null {
  let offset = start;
  let sawHandler = false;

  while (offset + 8 <= end) {
    let size = view.getUint32(offset);
    const type = String.fromCharCode(
      view.getUint8(offset + 4),
      view.getUint8(offset + 5),
      view.getUint8(offset + 6),
      view.getUint8(offset + 7),
    );
    let headerSize = 8;

    if (size === 1) {
      // 64-bit size, stored in the eight bytes after the type.
      if (offset + 16 > end) return sawHandler ? false : null;
      const hi = view.getUint32(offset + 8);
      const lo = view.getUint32(offset + 12);
      size = hi * 2 ** 32 + lo;
      headerSize = 16;
    } else if (size === 0) {
      // Box runs to the end of the file.
      size = end - offset;
    }

    if (size < headerSize) return sawHandler ? false : null;

    if (type === "hdlr") {
      // version+flags (4), pre_defined (4), then the handler type.
      const h = offset + headerSize + 8;
      if (h + 4 <= end) {
        sawHandler = true;
        const handler = String.fromCharCode(
          view.getUint8(h),
          view.getUint8(h + 1),
          view.getUint8(h + 2),
          view.getUint8(h + 3),
        );
        if (handler === "soun") return true;
      }
    } else if (BOXES_WITH_CHILDREN.has(type) && depth < 6) {
      const childEnd = Math.min(offset + size, end);
      const found = findSounHandler(view, offset + headerSize, childEnd, depth + 1);
      if (found === true) return true;
      if (found === false) sawHandler = true;
    }

    offset += size;
  }

  return sawHandler ? false : null;
}

/* ------------------------------------------------------------ WebM / Matroska */

/**
 * Matroska nests its track list deeply and with variable-width integers.
 * An audio track always declares a CodecID beginning "A_", and those ids are
 * stored as plain ASCII, so scanning for them is both simple and sound.
 */
const MATROSKA_AUDIO_CODECS = [
  "A_OPUS",
  "A_VORBIS",
  "A_AAC",
  "A_MPEG",
  "A_PCM",
  "A_FLAC",
  "A_AC3",
];

function webmHasAudio(bytes: Uint8Array): AudioTrackVerdict {
  let ascii = "";
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i];
    ascii += c >= 32 && c < 127 ? String.fromCharCode(c) : "\u0000";
  }
  if (MATROSKA_AUDIO_CODECS.some((codec) => ascii.includes(codec))) return "present";
  // The Tracks element sits in the header, so if we read the head and found
  // no audio codec id, there genuinely is not one.
  return ascii.includes("V_") ? "absent" : "unknown";
}

/* ---------------------------------------------------------------- entry point */

function isIsoBmff(bytes: Uint8Array): boolean {
  // 'ftyp' at offset 4 covers mp4, m4v and QuickTime's "qt  " brand.
  return (
    bytes.length > 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  );
}

function isMatroska(bytes: Uint8Array): boolean {
  return (
    bytes.length > 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  );
}

/** Parse an already-loaded buffer. Exported so it can be unit tested. */
export function audioTrackInBuffer(buffer: ArrayBuffer): AudioTrackVerdict {
  const bytes = new Uint8Array(buffer);

  if (isMatroska(bytes)) return webmHasAudio(bytes);

  if (isIsoBmff(bytes)) {
    const view = new DataView(buffer);
    const found = findSounHandler(view, 0, bytes.length);
    if (found === true) return "present";
    if (found === false) return "absent";
    return "unknown";
  }

  return "unknown";
}

/**
 * Inspect a picked file. Reads the head and, if that was inconclusive, the
 * tail — some encoders write `moov` last.
 */
export async function detectAudioTrack(file: File): Promise<AudioTrackVerdict> {
  try {
    const head = await file.slice(0, HEAD_BYTES).arrayBuffer();
    const fromHead = audioTrackInBuffer(head);
    if (fromHead !== "unknown" || file.size <= HEAD_BYTES) return fromHead;

    const tail = await file.slice(Math.max(0, file.size - TAIL_BYTES)).arrayBuffer();
    // The tail starts mid-box, so only a positive result is trustworthy here.
    return audioTrackInBuffer(tail) === "present" ? "present" : "unknown";
  } catch {
    return "unknown";
  }
}
