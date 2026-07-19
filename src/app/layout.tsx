import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { WelcomeNotice } from "@/components/onboarding/WelcomeNotice";
import { DEFAULT_SHARE_IMAGE, SITE_NAME, SITE_URL } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s｜${SITE_NAME}`,
  },
  applicationName: SITE_NAME,
  description: "面向学生秋招投递的岗位信息管理与进度记录工具。",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: "发现校招岗位、管理投递进度，把重要机会收进自己的星瓶。",
    images: [{ url: DEFAULT_SHARE_IMAGE, alt: "拾星 StarJob" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: "发现校招岗位、管理投递进度，把重要机会收进自己的星瓶。",
    images: [DEFAULT_SHARE_IMAGE],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full antialiased">
        <WelcomeNotice />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
