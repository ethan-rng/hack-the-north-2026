import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 ships a native binding; keep it external so Next/Turbopack
  // doesn't try to bundle it.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
