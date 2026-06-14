import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ["@consumet/extensions"],
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
      { protocol: "https", hostname: "*.comicknew.pictures" },
      { protocol: "https", hostname: "*.comick.art" },
      { protocol: "https", hostname: "*.comick.app" },
      { protocol: "https", hostname: "*.comick.media" },
      { protocol: "https", hostname: "*.mangadex.org" },
      { protocol: "https", hostname: "*.mangareader.to" },
      { protocol: "https", hostname: "novelfull.com" },
      { protocol: "https", hostname: "novelfull.net" },
      { protocol: "https", hostname: "witchculttranslation.com" },
      { protocol: "https", hostname: "novelbin.com" },
      { protocol: "https", hostname: "novelbin.net" },
      { protocol: "https", hostname: "images.novelbin.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "book-pic.webnovel.com" },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  allowedDevOrigins: ["172.27.16.1", "192.168.29.10"],
};

export default nextConfig;
