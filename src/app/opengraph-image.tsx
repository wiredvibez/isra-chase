import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt =
  "Isra Chase — הופכים חבורה שלמה לקבוצות שרצות בין משימות צילום, טקסט ומיקום.";
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

/*
 * The card is Hebrew, and the renderer's built-in font is Latin-only — without
 * a font that carries Hebrew glyphs every word would come out as empty boxes.
 * Rubik is the same family the site uses, and one bold cut covers the whole
 * card. The `process.cwd()` join is the shape Next's file tracing recognises,
 * so the .ttf travels with the deployment.
 */
const FONT_PATH = join(process.cwd(), "src/app/og-rubik-700.ttf");

/*
 * THE CARD IS LAID OUT BY HAND, RIGHT TO LEFT. Read this before editing it.
 *
 * The image renderer (satori) has no bidirectional text pass and ignores
 * `direction: rtl`: it places glyphs in logical order from the left, and lays
 * flex rows out left to right whatever you tell it. So this file does both jobs
 * itself — `visual()` hands it each Hebrew line already in visual order, and
 * every row is written with its right-hand element last.
 *
 * The rules that keep it correct:
 *   - every Hebrew line is its own element, pure Hebrew, and `nowrap`;
 *   - line breaks are chosen here, not by the renderer. A line that outgrows
 *     the card overflows visibly, which is a far better failure than a wrapped
 *     line silently reading backwards;
 *   - Latin runs (the brand name) are left alone — they are already visual.
 */
const visual = (line: string) => [...line].reverse().join("");

const HEADLINE = [
  "הופכים חבורה שלמה לקבוצות שרצות",
  "בין משימות צילום, טקסט ומיקום.",
];

const SUBHEAD = [
  "פיד פעילות בזמן אמת · טבלת מובילים בדירוג אולימפי",
  "נקודות בונוס · בקרה עם יומן שינויים",
];

// Rightmost first, because the row itself is still drawn left to right.
const CHIPS = [
  { label: "צ'ק-אין במיקום", color: GOLD },
  { label: "טקסט", color: TEAL_300 },
  { label: "צילום", color: CORAL },
];

export default async function OpengraphImage() {
  const fontData = await readFile(FONT_PATH);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 28,
          padding: 80,
          backgroundColor: TEAL_900,
          backgroundImage: `radial-gradient(circle at 22% 18%, ${TEAL_700} 0%, ${TEAL_900} 58%)`,
          color: WHITE,
          fontFamily: "Rubik",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>
            Isra Chase
          </div>
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
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 24,
          }}
        >
          {HEADLINE.map((line) => (
            <div
              key={line}
              style={{
                display: "flex",
                fontSize: 58,
                fontWeight: 700,
                lineHeight: 1.1,
                whiteSpace: "nowrap",
              }}
            >
              {visual(line)}
            </div>
          ))}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 6,
              marginTop: 6,
            }}
          >
            {SUBHEAD.map((line) => (
              <div
                key={line}
                style={{
                  display: "flex",
                  fontSize: 30,
                  color: TEAL_300,
                  whiteSpace: "nowrap",
                }}
              >
                {visual(line)}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          {CHIPS.map((chip) => (
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
                whiteSpace: "nowrap",
              }}
            >
              {visual(chip.label)}
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  backgroundColor: chip.color,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Rubik", data: fontData, style: "normal", weight: 700 }],
    },
  );
}
