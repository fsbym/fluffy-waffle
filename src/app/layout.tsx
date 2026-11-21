import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "校園美食地圖",
  description: "為台灣大學主校區學生精選附近美食與折扣。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
