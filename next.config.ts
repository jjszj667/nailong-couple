import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // A nine-photo memory upload is compressed client-side, but still needs
      // room for all WebP files, multipart boundaries, and other form fields.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
