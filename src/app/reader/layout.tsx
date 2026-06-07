import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Reader",
    template: "Reader | %s"
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
