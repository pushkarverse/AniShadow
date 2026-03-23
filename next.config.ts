import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ["@consumet/extensions", "got-scraping"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "s4.anilist.co",
      },
      {
        protocol: "https",
        hostname: "media.anilist.co",
      },
      { protocol: "https", hostname: "i.animepahe.si" },
      { protocol: "https", hostname: "i.animepahe.com" },
      { protocol: "https", hostname: "i.animepahe.ru" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "media.kitsu.app" },
      { protocol: "https", hostname: "media.kitsu.io" },
      { protocol: "https", hostname: "api.dicebear.com" },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  allowedDevOrigins: ["172.27.16.1", "192.168.29.10"],
};

export default nextConfig;
