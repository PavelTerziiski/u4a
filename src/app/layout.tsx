import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "u4a — Диктовки за деца",
  description: "Диктовки за деца 2-5 клас с изкуствен интелект",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bg">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
