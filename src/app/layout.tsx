import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Commotion — A place. Its people. Your what if.",
  description:
    "Explore a researched, living 3D world. Introduce events, follow individual decisions, and compare what changes.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
