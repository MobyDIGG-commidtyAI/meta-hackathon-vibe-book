import type { Metadata, Viewport } from "next";
import { Dela_Gothic_One, DotGothic16, M_PLUS_Rounded_1c } from "next/font/google";
import "./globals.css";

// Capsule-machine type: a heavy display gothic for titles and letters, a rounded gothic for UI,
// and a dot-matrix face only on the receipt slip.
const display = Dela_Gothic_One({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const ui = M_PLUS_Rounded_1c({ weight: ["500", "700", "800"], subsets: ["latin"], variable: "--font-ui" });
const receipt = DotGothic16({ weight: "400", subsets: ["latin"], variable: "--font-receipt" });

export const metadata: Metadata = {
  title: "VibeBook",
  description: "Don't just like it. Vibe it. Turn any post into something you can play, use, and share.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#d7322a",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable} ${receipt.variable}`}>
      <body>{children}</body>
    </html>
  );
}
