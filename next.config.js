/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    "8080-cs-553118797525-default.cs-europe-west4-pear.cloudshell.dev",
    "*.cloudshell.dev",
    "http://0.0.0.0:8080/",
    "https://8080-cs-553118797525-default.cs-europe-west4-pear.cloudshell.dev/?authuser=0",
    "*.cs-europe-west4-pear.cloudshell.dev",
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "8080-cs-553118797525-default.cs-europe-west4-pear.cloudshell.dev",
        "*.cloudshell.dev",
        "*.cs-europe-west4-pear.cloudshell.dev",
      ],
    },
  },
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

module.exports = nextConfig;