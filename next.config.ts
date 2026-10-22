import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Allow Cloud Shell Web Preview to access the Next.js dev server & HMR
  allowedDevOrigins: [
    "8080-cs-553118797525-default.cs-europe-west4-pear.cloudshell.dev",
    "*.cloudshell.dev",
    "*.cs-europe-west4-pear.cloudshell.dev",
  ],

  // 2. Allow Server Actions to be triggered from the Cloud Shell proxy URL
  experimental: {
    serverActions: {
      allowedOrigins: [
        "8080-cs-553118797525-default.cs-europe-west4-pear.cloudshell.dev",
        "*.cloudshell.dev",
        "*.cs-europe-west4-pear.cloudshell.dev",
      ],
    },
  },

  // 3. Allow next/image to optimize images served from your Cloud Shell URL
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "8080-cs-553118797525-default.cs-europe-west4-pear.cloudshell.dev",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.cloudshell.dev",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;