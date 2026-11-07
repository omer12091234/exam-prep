import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: "תרגול מבחנים",
  description: "תרגול ומעקב למידה למבחנים",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
