import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "여백의 우체통 | 마음이 쉬어가는 한 줄",
  description:
    "오늘의 감정을 조용히 기록하고, AI가 당신의 마음과 요일별 테마에 맞춰 배달해 주는 1~2통의 시 편지를 만나보세요.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#FDF9F2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="min-h-dvh paper-texture text-maple-text font-serif overflow-x-hidden selection:bg-maple-secondary-bg selection:text-maple-primary">
        {/* 모바일 우선(max-w-[430px] 호환) 및 데스크톱(max-w-[1100px]) 반응형 쉘 */}
        <div className="w-full min-h-dvh flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
