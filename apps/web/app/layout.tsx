import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "SmartRoute AI",
  description: "Generic routing optimization platform foundation scaffold.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
