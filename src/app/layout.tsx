import type { Metadata, Viewport } from "next";
import { Rubik, Secular_One } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth/auth-provider";
import "./globals.css";

// Rubik and Secular One both ship real Hebrew glyphs and a matching Latin set,
// so mixed strings like "TLV24X" inside a Hebrew sentence stay on one typeface.
const sans = Rubik({
  variable: "--font-app-sans",
  subsets: ["hebrew", "latin"],
  display: "swap",
});

const display = Secular_One({
  variable: "--font-app-display",
  subsets: ["hebrew", "latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  // Without this, next/og and any relative OG asset resolve against an unknown
  // host and Next warns on every production build.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3000"),
  ),
  title: {
    default: "Isra Chase — ציד מטמון שמזיז אנשים באמת",
    template: "%s · Isra Chase",
  },
  description:
    "בונים משימות צילום, טקסט ומיקום, מריצים טבלת מובילים חיה, ושולטים בכל הגשה ממקום אחד.",
  applicationName: "Isra Chase",
  appleWebApp: { capable: true, title: "Isra Chase", statusBarStyle: "default" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1014" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${sans.variable} ${display.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AuthProvider>{children}</AuthProvider>
        <Toaster
          position="top-center"
          dir="rtl"
          toastOptions={{
            style: {
              background: "var(--surface)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
            },
          }}
        />
      </body>
    </html>
  );
}
