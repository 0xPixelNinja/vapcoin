import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  allowedDevOrigins: ["192.168.0.*", "localhost", "*.ngrok-free.app"],

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8080/:path*", // Proxy to Backend
      },
    ];
  },
  
  // Allow ngrok tunneling
  experimental: {
    serverActions: {
      allowedOrigins: ["ngrok-free.app", "*.ngrok-free.app", "192.168.0.*", "vapcoin.rkr.cx"],
    },
  },
  output: "standalone",
};

export default nextConfig;
