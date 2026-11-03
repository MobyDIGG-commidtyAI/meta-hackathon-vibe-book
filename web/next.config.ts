import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
