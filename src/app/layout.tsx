import type { Metadata, Viewport } from "next";
import { Inter, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { ToastProvider } from "@/contexts/toast-context";
import { AppShell } from "@/components/layout/app-shell";
import { PwaRegister } from "@/components/pwa-register";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

const beVietnamPro = Be_Vietnam_Pro({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // Không chặn zoom theo quy tắc an toàn UI/UX
  themeColor: "#223873",
};

export const metadata: Metadata = {
  title: "Quản lý bến bãi Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh",
  description: "Hệ thống quản lý bến bãi logistics Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Quản lý bến bãi Sơn Cảng",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${inter.variable} ${beVietnamPro.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-[#FFFFFF] text-[#17202E]">
        <AuthProvider>
          <ToastProvider>
            <AppShell>
              {children}
            </AppShell>
            <PwaRegister />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
