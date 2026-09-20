import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * firebase-admin must not be bundled. Its transitive dependency jwks-rsa is
   * CommonJS and `require()`s jose, which is ESM-only from v6 — bundling the
   * pair produces ERR_REQUIRE_ESM at runtime on the server. Listing it here
   * leaves it to Node's own resolver, which handles the interop correctly.
   */
  serverExternalPackages: ["firebase-admin"],

  /**
   * Without this, opening the dev server on 127.0.0.1 rather than localhost
   * makes Next treat /_next/hmr as a cross-origin request. The Turbopack
   * client never connects and the page renders but never hydrates — it looks
   * like the app is simply broken, with nothing in the console to say why.
   */
  allowedDevOrigins: ["127.0.0.1", "localhost"],

  images: {
    remotePatterns: [
      // Submission media and artwork served from Firebase Storage.
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "*.firebasestorage.app" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
