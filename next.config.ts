import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pg is a Node-native dependency — keep it external to the Server Components bundle.
  serverExternalPackages: ["pg"],
};

export default nextConfig;
