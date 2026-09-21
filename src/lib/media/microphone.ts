"use client";

/**
 * Microphone access for in-page video capture.
 *
 * `<input type="file" accept="video/*" capture>` hands recording to the
 * browser, and on iOS Safari that capture session only records an audio track
 * if the *site* already holds microphone permission. A page that never asks
 * gets video-only files — a valid .mov with an `avc1` track, the usual `mebx`
 * metadata tracks the camera writes, and no `soun` track whatsoever. Which is
 * exactly what this app was producing.
 *
 * So we ask first. Permission is requested and the tracks are stopped
 * immediately: we want the grant, not the stream.
 */

export type MicrophoneState = "granted" | "denied" | "prompt" | "unsupported";

function supported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

/** Read the current state without showing a prompt, where the browser allows. */
export async function microphoneState(): Promise<MicrophoneState> {
  if (!supported()) return "unsupported";
  // Safari has only recently shipped the microphone permission name, and
  // throws for unknown names, so a failure here just means "we must ask".
  try {
    const status = await navigator.permissions?.query({
      name: "microphone" as PermissionName,
    });
    if (status?.state === "granted") return "granted";
    if (status?.state === "denied") return "denied";
    return "prompt";
  } catch {
    return "prompt";
  }
}

/**
 * Ask for the microphone, then release it at once.
 *
 * Must be called from a user gesture on iOS. Returns the resulting state so
 * the caller can explain a refusal rather than silently recording in mute.
 */
export async function requestMicrophone(): Promise<MicrophoneState> {
  if (!supported()) return "unsupported";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Holding the mic open would leave the recording indicator lit and can
    // stop the camera session from claiming it.
    for (const track of stream.getTracks()) track.stop();
    return "granted";
  } catch (error) {
    const name = (error as DOMException)?.name;
    // NotAllowedError is a refusal; anything else (no device, in use) is not
    // something the player can fix by tapping again.
    return name === "NotAllowedError" || name === "SecurityError"
      ? "denied"
      : "unsupported";
  }
}
