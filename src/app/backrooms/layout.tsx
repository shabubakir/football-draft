import type { Metadata, Viewport } from "next";
import "./backrooms.css";

export const metadata: Metadata = {
  title: "BACKROOMS: LEVEL 0 — Football Draft",
  description:
    "Хоррор от первого лица: собери 8 страниц, сбеги из процедурного лабиринта — и не дай ему услышать твои шаги.",
  applicationName: "Backrooms: Level 0",
  alternates: { canonical: "/backrooms" },
};

export const viewport: Viewport = {
  themeColor: "#0a0905",
  colorScheme: "dark",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function BackroomsLayout({
  children,
}: LayoutProps<"/backrooms">) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="h-full overflow-hidden bg-black text-zinc-200">
        {children}
      </body>
    </html>
  );
}
