import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "USS Enterprise NCC-1701 | Cinematic Experience",
  description: "A stunning, movie-quality interactive 3D visualization of the legendary USS Enterprise built with Next.js, React Three Fiber, and cutting-edge VFX.",
  keywords: ["Star Trek", "USS Enterprise", "NCC-1701", "3D", "Three.js", "React Three Fiber", "Interactive", "Space"],
  authors: [{ name: "Starfleet Engineering" }],
  openGraph: {
    title: "USS Enterprise NCC-1701 | Cinematic Experience",
    description: "Explore the legendary Constitution-class starship in stunning 3D",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
