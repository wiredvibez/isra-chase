import { describe, expect, it } from "vitest";
import { audioTrackInBuffer } from "./audio-track";

/* ---------------------------------------------------- tiny ISO-BMFF builders */

function box(type: string, payload: Uint8Array): Uint8Array {
  const out = new Uint8Array(8 + payload.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, out.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(payload, 8);
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** An `hdlr` box: version+flags, pre_defined, then the handler type. */
function hdlr(handler: string): Uint8Array {
  const payload = new Uint8Array(12);
  for (let i = 0; i < 4; i++) payload[8 + i] = handler.charCodeAt(i);
  return box("hdlr", payload);
}

function ftyp(brand: string): Uint8Array {
  const payload = new Uint8Array(8);
  for (let i = 0; i < 4; i++) payload[i] = brand.charCodeAt(i);
  return box("ftyp", payload);
}

const trak = (handler: string) => box("trak", box("mdia", hdlr(handler)));
const mp4 = (brand: string, ...traks: Uint8Array[]) =>
  concat(ftyp(brand), box("moov", concat(...traks)));

const ab = (bytes: Uint8Array) =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

/* --------------------------------------------------------------------- tests */

describe("audioTrackInBuffer — ISO-BMFF", () => {
  it("finds an audio track alongside video", () => {
    expect(audioTrackInBuffer(ab(mp4("isom", trak("vide"), trak("soun"))))).toBe("present");
  });

  it("reports absent when only a video track exists", () => {
    // This is a time-lapse or slow-mo recording: valid, and silent.
    expect(audioTrackInBuffer(ab(mp4("isom", trak("vide"))))).toBe("absent");
  });

  it("handles QuickTime's brand, which is what an iPhone sends", () => {
    expect(audioTrackInBuffer(ab(mp4("qt  ", trak("vide"), trak("soun"))))).toBe("present");
    expect(audioTrackInBuffer(ab(mp4("qt  ", trak("vide"))))).toBe("absent");
  });

  it("finds the audio track whichever order the traks appear in", () => {
    expect(audioTrackInBuffer(ab(mp4("isom", trak("soun"), trak("vide"))))).toBe("present");
  });

  it("ignores handlers that are neither audio nor video", () => {
    expect(
      audioTrackInBuffer(ab(mp4("isom", trak("vide"), trak("sbtl"), trak("meta")))),
    ).toBe("absent");
  });

  it("says unknown when no handler box is present at all", () => {
    // Truncated or unparseable: must not be reported as silent.
    expect(audioTrackInBuffer(ab(concat(ftyp("isom"), box("free", new Uint8Array(4)))))).toBe(
      "unknown",
    );
  });

  it("walks a 64-bit box header without losing its place", () => {
    const big = (() => {
      const payload = box("mdia", hdlr("soun"));
      const out = new Uint8Array(16 + payload.length);
      const view = new DataView(out.buffer);
      view.setUint32(0, 1); // size === 1 ⇒ 64-bit size follows the type
      for (let i = 0; i < 4; i++) out[4 + i] = "trak".charCodeAt(i);
      view.setUint32(8, 0);
      view.setUint32(12, out.length);
      out.set(payload, 16);
      return out;
    })();
    expect(audioTrackInBuffer(ab(concat(ftyp("isom"), box("moov", big))))).toBe("present");
  });
});

describe("audioTrackInBuffer — Matroska", () => {
  const ebml = (body: string) => {
    const header = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]);
    const text = new TextEncoder().encode(body);
    return concat(header, text);
  };

  it("finds an Opus or Vorbis track", () => {
    expect(audioTrackInBuffer(ab(ebml("...V_VP8...A_OPUS...")))).toBe("present");
    expect(audioTrackInBuffer(ab(ebml("...V_VP9...A_VORBIS...")))).toBe("present");
  });

  it("reports absent for a video-only WebM", () => {
    expect(audioTrackInBuffer(ab(ebml("...V_VP8...")))).toBe("absent");
  });

  it("says unknown when no codec id is readable", () => {
    expect(audioTrackInBuffer(ab(ebml("nothing useful here")))).toBe("unknown");
  });
});

describe("audioTrackInBuffer — other input", () => {
  it("says unknown for a container it does not recognise", () => {
    expect(audioTrackInBuffer(ab(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])))).toBe(
      "unknown",
    );
  });

  it("says unknown rather than throwing on an empty buffer", () => {
    expect(audioTrackInBuffer(new ArrayBuffer(0))).toBe("unknown");
  });
});
