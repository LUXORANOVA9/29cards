import { ReactNode } from 'react';
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sindhi Patta",
  description: "Real-time Multiplayer Card Game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-gray-900 text-white">
        {children}
      </body>
    </html>
  );
}
