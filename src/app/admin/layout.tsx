import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "管理后台 · 校园美食地图",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
