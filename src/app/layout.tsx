import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";
import { APP_NAME } from "@/lib/constants";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700", "800"],
  variable: "--font-tajawal",
  display: "swap",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "النظام المتكامل للأمانة العامة لمجلس القضاء الأعلى بمحكمة النقض",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
