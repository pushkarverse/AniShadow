import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["300", "400", "500", "600", "700"],
});

export const viewport = {
  themeColor: "#080808",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "AniShadow",
    template: "AniShadow | %s"
  },
  description: "Immersive, premium anime and manga experience.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AniShadow",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${spaceGrotesk.variable} font-sans antialiased min-h-screen bg-background text-foreground`}
      >
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <main className="flex-1 pb-20 md:pb-0">{children}</main>
            <PWAInstallPrompt />
          </div>
        </Providers>
      </body>
    </html>
  );
}
