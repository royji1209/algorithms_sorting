"use client";

import React, { useState } from "react";
import Link from "next/link";
import AdminConsoleView from "@/components/stitch/AdminConsoleView";

export default function AdminDashboardPage() {
  const [nightPostToggle, setNightPostToggle] = useState<boolean>(true);

  return (
    <div className="bg-surface text-on-surface font-body-md text-body-md antialiased min-h-dvh flex flex-col">
      <header className="fixed top-0 left-0 w-full z-50 bg-surface/90 backdrop-blur-md shadow-[0_1px_8px_rgba(45,36,30,0.04)] border-b border-outline-variant/30">
        <div className="h-[68px] max-w-[1100px] mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-baseline gap-space-sm">
            <Link href="/" className="font-title-md text-title-md text-primary tracking-tight font-medium">
              여백의 우체통
            </Link>
            <span className="font-caption text-caption text-tertiary hidden sm:inline-block tracking-normal">
              마음이 쉬어가는 한 줄 · 관리자 전용 (/admin)
            </span>
          </div>
          <Link href="/" className="px-3.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-ui-label-md text-ui-label-md transition-colors">
            우체통 메인으로 돌아가기
          </Link>
        </div>
      </header>
      <main className="w-full flex-1 pt-[68px] bg-surface">
        <AdminConsoleView nightPostToggle={nightPostToggle} setNightPostToggle={setNightPostToggle} />
      </main>
    </div>
  );
}
