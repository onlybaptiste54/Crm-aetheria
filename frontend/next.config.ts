import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // Pour Docker production
  // Désactiver Turbopack pour la production
  experimental: {
    turbopack: false,
  },
};

export default nextConfig;
