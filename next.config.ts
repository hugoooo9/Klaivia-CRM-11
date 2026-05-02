import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Permet l'upload de pièces jointes (PDF/devis/images) jusqu'à 12 MB
      // (10 MB fichier + overhead base64 + multipart ~33%)
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
