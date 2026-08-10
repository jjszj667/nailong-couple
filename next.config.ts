import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Check-in and life-photo forms allow images up to 5 MB. Leave room for
      // multipart boundaries and the other form fields as required by Next.js.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
