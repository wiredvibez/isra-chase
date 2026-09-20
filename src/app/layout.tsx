import type { Metadata, Viewport } from "next";
import { Nunito, Baloo_2 } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth/auth-provider";
import "./globals.css";

const sans = Nunito({
  variable: "--font-app-sans",
  subsets: ["latin"],
  display: "swap",
});

const display = Baloo_2({
  variable: "--font-app-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Isra Chase — scavenger hunts that actually get people moving",
    template: "%s · Isra Chase",
  },
  description:
    "Build photo, video, GPS and quiz missions, run live leaderboards, and moderate every submission from one place.",
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
      lang="en"
      className={`${sans.variable} ${display.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AuthProvider>{children}</AuthProvider>
        <Toaster
          position="top-center"
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
