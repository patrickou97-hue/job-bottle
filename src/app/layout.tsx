import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { AppMotionProvider } from "@/components/layout/AppMotionProvider";
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
  description: "汇集校招岗位，整理简历与网申进度，把每一个值得奔赴的机会收进星瓶。",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: "汇集校招岗位，整理简历与网申进度，把每一个值得奔赴的机会收进星瓶。",
    images: [{ url: DEFAULT_SHARE_IMAGE, alt: "拾星 StarJob" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: "汇集校招岗位，整理简历与网申进度，把每一个值得奔赴的机会收进星瓶。",
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
        <AppMotionProvider>
          <WelcomeNotice />
          {children}
        </AppMotionProvider>
        <Analytics />
      </body>
    </html>
  );
}
