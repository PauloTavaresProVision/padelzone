import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // As fotos de torneio/cartaz podem passar de 1 MB (limite por defeito das Server Actions).
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
