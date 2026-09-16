import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Edwin Mideros — Citas",
    short_name: "Edwin Citas",
    description: "Confirmación de citas psicológicas",
    start_url: "/admin",
    display: "standalone",
    background_color: "#F7F2F0",
    theme_color: "#7A1F2B",
    lang: "es-CO",
    icons: [
      {
        src: "/icons/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
