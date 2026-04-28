import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmniPro 220 Assistant",
  description: "Multimodal welding assistant (Prox challenge)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
