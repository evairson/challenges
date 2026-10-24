import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "imphackt — CTF",
  description: "Challenges de sécurité et tableau des scores",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <TopBar />
        {children}
      </body>
    </html>
  );
}
