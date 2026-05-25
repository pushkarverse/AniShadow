import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "MangaShadow",
    template: "MangaShadow | %s"
  },
  description: "Immersive, premium manga experience."
};

export default function MangaLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return children;
}
