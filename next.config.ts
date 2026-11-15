import type { NextConfig } from "next";

// GitHub Codespaces serves the forwarded port from https://<codespace>-3000.app.github.dev.
// Allow that origin for dev assets and Server Actions — only when running inside a
// Codespace, never on Vercel (it would let any *.app.github.dev page trigger actions).
const codespaceOrigins = process.env.CODESPACES === "true" ? ["*.app.github.dev"] : [];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: codespaceOrigins,
  experimental: {
    serverActions: { allowedOrigins: codespaceOrigins },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
