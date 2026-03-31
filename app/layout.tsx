import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claude Agent",
  description: "ブラウザで動くAIコーディングエージェント",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="font-mono antialiased">{children}</body>
    </html>
  );
}
