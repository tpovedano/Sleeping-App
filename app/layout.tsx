import type { Metadata, Viewport } from "next";
import { Lora, Raleway } from "next/font/google";
import "./globals.css";

const lora = Lora({ subsets: ["latin"], variable: "--font-lora", weight: ["500", "600", "700"] });
const raleway = Raleway({ subsets: ["latin"], variable: "--font-raleway", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "LetSleep · Diario de sueño",
  description: "Registra siestas y noches, y descubre los horarios de sueño que mejor sientan.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0b1020",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${lora.variable} ${raleway.variable}`}>
      <body className="night-sky">{children}</body>
    </html>
  );
}
