import type { Metadata } from "next";
import { AuthProvider } from "./auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "校园美食地图 · 多大 St. George",
  description: "为多伦多大学 St. George 主校区学生整理附近美食与折扣。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hans" className="h-full">
      <body className="min-h-full"><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
