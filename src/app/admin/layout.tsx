import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "管理后台 · UTSG 简餐食堂指北",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
