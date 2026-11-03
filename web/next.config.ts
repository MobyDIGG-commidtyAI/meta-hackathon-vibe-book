import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the dev badge out of demo recordings.
  devIndicators: false,
  // lib/prompts.ts reads the design guides from disk at runtime.
  outputFileTracingIncludes: {
    "/api/**": ["./lib/design/*.md"],
  },
  async headers() {
    // The extension panel and the /app page call the API cross-origin.
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, X-Edit-Token" },
        ],
      },
    ];
  },
};

export default nextConfig;
