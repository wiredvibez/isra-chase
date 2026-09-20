import { ImageResponse } from "next/og";

export const alt =
  "Isra Chase — turn any group into teams racing through photo, text and GPS missions.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/*
 * Social cards are a flat raster: there is no CSS custom property support and
 * no light/dark variant, so the brand palette is written out literally here.
 * These values are the same `--brand-*` / `--accent-*` / `--gold-*` tokens
 * declared in globals.css.
 */
const TEAL_900 = "#0a413b";
const TEAL_700 = "#076357";
const TEAL_300 = "#5bd2bd";
const CORAL = "#ff8f6b";
const GOLD = "#ffc94d";
const WHITE = "#ffffff";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: 28,
          padding: 80,
          backgroundColor: TEAL_900,
          backgroundImage: `radial-gradient(circle at 78% 18%, ${TEAL_700} 0%, ${TEAL_900} 58%)`,
          color: WHITE,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="72" height="72" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="9" fill={TEAL_300} />
            <g
              stroke={TEAL_900}
              fill={TEAL_900}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M8.5 23 14 17.5l5 2 3.5-7.5"
                fill="none"
                strokeWidth="1.9"
                strokeDasharray="0.2 3.6"
              />
              <circle cx="8.5" cy="23" r="1.9" stroke="none" />
              <circle cx="14" cy="17.5" r="1.6" stroke="none" />
              <circle cx="19" cy="19.5" r="1.6" stroke="none" />
              <circle cx="22.8" cy="10.2" r="3.4" fill="none" strokeWidth="2.1" />
            </g>
          </svg>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>
            Isra Chase
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              fontSize: 60,
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: -2,
              maxWidth: 940,
            }}
          >
            Turn any group into teams racing through photo, text and GPS missions.
          </div>
          <div style={{ display: "flex", fontSize: 30, color: TEAL_300, maxWidth: 860 }}>
            Live activity feed · Olympic-ranked leaderboard · bonus points ·
            moderation with an audit trail
          </div>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          {[
            { label: "Camera", color: CORAL },
            { label: "Text", color: TEAL_300 },
            { label: "GPS check-in", color: GOLD },
          ].map((chip) => (
            <div
              key={chip.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 24px",
                borderRadius: 999,
                border: `2px solid ${chip.color}`,
                color: chip.color,
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  backgroundColor: chip.color,
                }}
              />
              {chip.label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
