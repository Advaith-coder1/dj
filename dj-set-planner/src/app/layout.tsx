import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Antigravity DJ Architect | Harmonic Set-Planning Engine",
  description: "Harmonic Set-Progression Engine for Rekordbox, M3U, and Spotify",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#07080c] text-zinc-100">
        {children}
      </body>
    </html>
  );
}
