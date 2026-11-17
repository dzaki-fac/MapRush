import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { GameProvider } from "@/context/GameContext";
import "./globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MapRush — Sebut negara, rebut peta",
  description:
    "Game 1v1 real-time: sebut nama negara, klaim wilayah di peta dunia, dan kumpulkan poin sebelum waktu habis.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <GameProvider>{children}</GameProvider>
      </body>
    </html>
  );
}
