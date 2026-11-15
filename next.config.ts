import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Permite rodar um build de verificação sem tocar na pasta do servidor de desenvolvimento.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
};

export default nextConfig;
