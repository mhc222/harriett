import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Harriett",
    short_name: "Harriett",
    description: "Your Pritchett-Moore transaction assistant",
    start_url: "/chat",
    display: "standalone",
    background_color: "#f3efe8",
    theme_color: "#8f1d2c",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/harriett-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/harriett-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/harriett-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

