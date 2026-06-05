import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "Social Auto-Bot",
  description: "Create and publish social content from news with AI assistance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
