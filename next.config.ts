import type { NextConfig } from "next"
import path from "node:path"

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(process.cwd()),
  serverExternalPackages: ["genlayer-js"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
}

export default nextConfig
