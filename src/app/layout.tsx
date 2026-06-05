import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Creative Dhraa | Personalized Gifts & Keepsakes",
  description:
    "Handcrafted personalized gifts — keychains, photo frames, custom prints, and more. Upload your photos, choose a design, and create something unique.",
  keywords: [
    "personalized gifts",
    "custom keychains",
    "photo gifts",
    "customised gifts India",
    "creative dhraa",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
