import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HTML2PDF Pro",
  description: "HTML, URL and template based PDF generation SaaS foundation."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
