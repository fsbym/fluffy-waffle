import type { Metadata } from "next";
import { AuthProvider } from "./auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "UTSG 简餐食堂指北",
  description: "多伦多大学 St. George 校区附近的简餐、食堂和好吃的菜，附税前价格和学生优惠，由同学们共同维护。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hans" className="h-full">
      <body className="min-h-full"><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
