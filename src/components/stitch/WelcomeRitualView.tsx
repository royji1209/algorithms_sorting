"use client";

import React, { useEffect, useState } from "react";

interface WelcomeRitualViewProps {
  penName?: string;
  onEnterSanctuary: () => void;
  onNavigateTab: (tab: "mailbox" | "write" | "library" | "night-sky" | "admin") => void;
}

export default function WelcomeRitualView({
  penName = "달무리 서재",
  onEnterSanctuary,
  onNavigateTab,
}: WelcomeRitualViewProps) {
  const [timeLeft, setTimeLeft] = useState<number>(8);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isCertificateSaved, setIsCertificateSaved] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused]);

  useEffect(() => {
    if (timeLeft === 0 && !isPaused) {
      onEnterSanctuary();
    }
  }, [timeLeft, isPaused, onEnterSanctuary]);

  const handleSaveCertificate = () => {
    setIsCertificateSaved(true);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3200);
  };

  return (
    <div
      data-testid="welcome-ritual-view"
      className="flex flex-col w-full relative overflow-hidden py-space-xl px-gutter"
    >
      {/* Ambient Atmospheric Floating Specks / Warm Dust Motes */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-60">
        <div
          className="absolute -top-12 left-1/4 w-96 h-96 rounded-full bg-secondary-fixed/30 blur-3xl mix-blend-multiply animate-pulse"
          style={{ animationDuration: "8s" }}
        />
        <div
          className="absolute top-1/3 -right-20 w-[420px] h-[420px] rounded-full bg-primary-fixed/30 blur-3xl mix-blend-multiply animate-pulse"
          style={{ animationDuration: "11s" }}
        />
        <div className="absolute bottom-10 left-10 w-80 h-80 rounded-full bg-surface-container-high/60 blur-2xl" />
        <svg
          className="absolute inset-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            className="text-secondary/40 animate-ping"
            cx="12%"
            cy="18%"
            fill="currentColor"
            r="1.5"
            style={{ animationDuration: "6s" }}
          />
          <circle
            className="text-primary/30 animate-pulse"
            cx="84%"
            cy="28%"
            fill="currentColor"
            r="1.2"
            style={{ animationDuration: "4.5s" }}
          />
          <circle
            className="text-tertiary/20"
            cx="36%"
            cy="72%"
            fill="currentColor"
            r="2"
          />
          <circle
            className="text-secondary/30 animate-pulse"
            cx="70%"
            cy="82%"
            fill="currentColor"
            r="1.8"
            style={{ animationDuration: "7s" }}
          />
          <circle
            className="text-tertiary/30"
            cx="52%"
            cy="38%"
            fill="currentColor"
            r="1"
          />
        </svg>
      </div>

      {/* Main Ritual Envelope & Certificate Container */}
      <div className="relative z-10 max-w-[840px] mx-auto w-full flex flex-col items-center">
        {/* Top Step Marker & Ceremonial Overline */}
        <div className="flex items-center gap-space-sm mb-space-md">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-fixed text-primary font-caption text-caption">
            <span className="material-symbols-outlined text-[14px]">done</span>
          </span>
          <span className="font-ui-label-sm text-ui-label-sm tracking-widest text-tertiary uppercase">
            등록 완료 · 우편명부 기재 확인
          </span>
          <span className="text-tertiary-fixed-dim">/</span>
          <span className="font-ui-label-sm text-ui-label-sm text-secondary">
            입실 의례 완료
          </span>
        </div>

        {/* Ceremonial Letter / Admission Parchment Card */}
        <article className="relative w-full bg-surface-container-lowest rounded-xl shadow-xl transition-transform duration-700 ease-out p-6 sm:p-8 md:p-12 overflow-hidden group border border-outline-variant/25">
          <div className="absolute inset-0 bg-gradient-to-br from-surface-container-low/60 via-transparent to-surface-container-highest/20 pointer-events-none" />
          {/* Watermark Seal on the Letter Corner */}
          <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-surface-container-low/70 pointer-events-none flex items-center justify-center select-none opacity-40">
            <span className="font-headline-lg text-headline-lg text-tertiary font-light tracking-widest">
              餘白
            </span>
          </div>

          {/* Header Registry Details */}
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-md mb-space-md border-b border-outline-variant/25">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">
                local_post_office
              </span>
              <span className="font-caption text-caption tracking-wider text-tertiary uppercase">
                여백의 우편권 · 서재 입실 증서
              </span>
            </div>
            <div className="flex items-center gap-space-xs font-ui-label-sm text-ui-label-sm text-tertiary">
              <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-medium">
                우편명부 제 2026-1118호
              </span>
              <span className="hidden sm:inline text-tertiary-fixed-dim">·</span>
              <span>등록일 2026년 11월 18일</span>
            </div>
          </div>

          {/* Main Welcome Address */}
          <div className="relative my-space-md">
            <div className="flex flex-col gap-space-xs">
              <span className="font-ui-label-md text-ui-label-md text-secondary font-medium tracking-wide">
                입실 환영 서신
              </span>
              <h1 className="font-headline-lg text-2xl sm:text-headline-lg text-on-surface tracking-tight font-medium">
                <span className="text-primary font-semibold">{penName}</span> 님,
                여백의 우체통에 오신 것을 환영합니다.
              </h1>
            </div>
            <p className="font-body-lg text-base sm:text-body-lg text-tertiary mt-space-sm leading-relaxed max-w-2xl">
              세상의 번잡함을 문턱에 내려놓고, 이제 당신만의 고요한 속도로
              머물러보세요.
              <br className="hidden sm:inline" /> 이곳에서는 서두르는 발걸음도
              잠시 쉬어가며, 여백 속에 온기 어린 마음을 남길 수 있습니다.
            </p>
          </div>

          {/* Two-Column Bento Layout (Arrival Gift & Library Pass Stamp) */}
          <div className="relative grid grid-cols-1 md:grid-cols-12 gap-space-md my-space-lg">
            {/* Left Column: The Arrival First Letter Gift Preview */}
            <div className="md:col-span-7 bg-surface-container-low rounded-lg p-space-md flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-space-xs">
                  <span className="font-ui-label-sm text-ui-label-sm text-primary font-semibold tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">
                      mark_email_unread
                    </span>
                    도착한 첫 번째 선물
                  </span>
                  <span className="font-caption text-caption text-tertiary">
                    오늘의 정오 우편
                  </span>
                </div>
                <h2 className="font-title-md text-title-md text-on-surface mt-space-xs font-medium">
                  나태주 시인의 [풀꽃] 외 1편
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs italic line-clamp-2">
                  &ldquo;자세히 보아야 예쁘다. 오래 보아야 사랑스럽다. 너도
                  그렇다.&rdquo;
                </p>
              </div>
              <div className="flex items-center gap-space-sm pt-space-sm mt-space-sm">
                <div className="w-7 h-7 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
                  <span className="material-symbols-outlined text-[15px]">
                    auto_stories
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-ui-label-sm text-ui-label-sm text-on-surface font-medium">
                    개인 우편함에 안전하게 보관됨
                  </span>
                  <span className="font-caption text-caption text-tertiary">
                    입장 즉시 서재에서 열람할 수 있습니다.
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Tactile Wax Seal & Registry Monogram Emblem */}
            <div className="md:col-span-5 bg-surface-container rounded-lg p-space-md flex flex-col items-center justify-center text-center relative overflow-hidden shadow-sm">
              <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-surface-container-high/60 pointer-events-none" />
              <div className="relative mb-space-sm group-hover:scale-105 transition-transform duration-500 ease-out">
                <div className="relative flex items-center justify-center filter drop-shadow-[0_8px_16px_rgba(142,40,28,0.35)]">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#A83222] via-[#8E281C] to-[#68190F] flex items-center justify-center p-1 relative shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),inset_0_-3px_6px_rgba(0,0,0,0.45)] border border-[#7A1F14]/50">
                    <div className="w-16 h-16 rounded-full border border-[#D97D64]/40 bg-gradient-to-br from-[#982D1E] to-[#781B10] flex items-center justify-center relative shadow-[inset_0_2px_5px_rgba(0,0,0,0.4),0_1px_2px_rgba(255,255,255,0.2)]">
                      <div className="absolute top-1 left-2.5 w-4 h-2 rounded-full bg-white/25 rotate-[-35deg] pointer-events-none blur-[0.5px]" />
                      <div className="flex flex-col items-center justify-center select-none">
                        <span className="font-headline-md text-[20px] font-semibold text-[#F7D8B5] tracking-widest leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
                          餘白
                        </span>
                        <span className="text-[8px] font-medium tracking-[0.2em] text-[#E8BFA0]/80 uppercase mt-0.5 scale-90">
                          Margin Post
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <span className="font-ui-label-md text-ui-label-md text-on-surface font-medium mt-1">
                서재 입실 인가 왁스 실링
              </span>
              <span className="font-caption text-caption text-tertiary mt-0.5">
                정식 필명 교부 및 사물함 배정 완료
              </span>
              <div className="mt-space-sm inline-flex items-center gap-1 text-primary text-[12px] font-medium bg-surface-container-lowest px-2.5 py-1 rounded-full shadow-xs border border-outline-variant/30">
                <span className="material-symbols-outlined text-[14px] text-primary">
                  verified
                </span>
                <span>{penName} 고유 서명 유효</span>
              </div>
            </div>
          </div>

          {/* Trust & Anonymity Assurance Bar */}
          <div className="relative bg-surface rounded-lg p-space-sm px-space-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-xs">
            <div className="flex items-center gap-space-xs flex-wrap">
              <span className="material-symbols-outlined text-secondary text-[18px]">
                shield_with_heart
              </span>
              <span className="font-caption text-caption text-on-surface-variant font-medium">
                익명의 온기 보호 규약 가동 중
              </span>
              <span className="text-tertiary-fixed-dim">·</span>
              <span className="font-caption text-caption text-tertiary">
                우편함 간 교신 시 실명 및 민감 정보는 철저히 은폐됩니다.
              </span>
            </div>
            <span className="font-ui-label-sm text-ui-label-sm text-secondary font-semibold shrink-0">
              보호등급 1급
            </span>
          </div>

          {/* Letter Footer */}
          <div className="relative mt-space-lg pt-space-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-md border-t border-outline-variant/20">
            <div className="flex items-center gap-space-sm">
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-on-primary">
                <span className="material-symbols-outlined text-[20px]">
                  cruelty_free
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-ui-label-md text-ui-label-md text-on-surface font-medium">
                  여백의 우체통 문지기 올림
                </span>
                <span className="font-caption text-caption text-tertiary">
                  당신의 조용한 사유를 지키는 파수꾼
                </span>
              </div>
            </div>
            <div className="flex items-center gap-space-xs text-tertiary font-ui-label-sm text-ui-label-sm">
              <span className="material-symbols-outlined text-[16px]">
                history_edu
              </span>
              <span>서신 보관함 번호 #MO-7729</span>
            </div>
          </div>
        </article>

        {/* Transition Actions & Countdown Controller */}
        <div className="w-full max-w-[640px] mt-space-lg flex flex-col items-center gap-space-md">
          <div className="w-full relative flex flex-col items-center">
            <button
              type="button"
              id="enter-sanctuary-btn"
              onClick={onEnterSanctuary}
              className="touch-target group relative w-full sm:w-auto min-w-[280px] px-space-lg py-space-sm bg-primary hover:bg-primary-container text-on-primary rounded-lg font-title-md text-title-md flex items-center justify-center gap-space-xs shadow-md transition-all duration-300 hover:scale-[1.02] active:scale-[0.99]"
            >
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-space-xs">
                  <span className="font-medium">여백의 우체통 입장하기</span>
                  <span className="material-symbols-outlined text-[20px] transition-transform duration-300 group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </div>
                <span className="font-ui-label-sm text-[11px] opacity-80 font-normal tracking-wide">
                  오늘의 편지함 및 감정 서랍으로 이동
                </span>
              </div>
            </button>

            {/* Auto-transition Countdown Status Bar */}
            <div className="mt-space-sm flex items-center gap-space-xs text-center font-caption text-caption text-tertiary flex-wrap justify-center">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              {isPaused ? (
                <span className="text-on-surface-variant">
                  잠시 멈춤: 천천히 서신을 음미하신 후 입장해주세요.
                </span>
              ) : (
                <span id="countdown-label">
                  <strong className="text-primary font-semibold" id="seconds-counter">
                    {timeLeft}
                  </strong>
                  초 후 메인 홈(오늘의 편지함)으로 자동으로 발걸음을 옮깁니다.
                </span>
              )}
              <button
                type="button"
                id="pause-countdown-btn"
                onClick={() => setIsPaused((prev) => !prev)}
                className="ml-1 text-on-surface-variant hover:text-primary underline cursor-pointer font-ui-label-sm text-ui-label-sm"
              >
                {isPaused ? "카운트다운 재개" : "잠시 멈추기"}
              </button>
            </div>
            <p className="font-caption text-caption text-tertiary text-center mt-1 opacity-90 max-w-md">
              첫 방문 시 1회만 제공되는 입실 환영 서신입니다. 이후 방문 시에는
              평온한 일상의 메인 홈(오늘의 편지함)으로 곧바로 이어집니다.
            </p>
          </div>

          {/* Secondary Sub-Actions */}
          <div className="flex flex-wrap items-center justify-center gap-space-md pt-space-xs">
            <button
              type="button"
              id="save-certificate-btn"
              onClick={handleSaveCertificate}
              className="inline-flex items-center gap-1.5 px-space-sm py-1.5 rounded-lg font-ui-label-md text-ui-label-md text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all"
            >
              <span className="material-symbols-outlined text-[17px] text-primary">
                {isCertificateSaved ? "bookmark_added" : "bookmark_add"}
              </span>
              <span className={isCertificateSaved ? "text-primary font-medium" : ""}>
                {isCertificateSaved
                  ? "갈무리 완료"
                  : "입실 환영 서신 갈무리(보관함 저장)"}
              </span>
            </button>
            <span className="text-tertiary-fixed-dim">·</span>
            <button
              type="button"
              onClick={() => {
                onEnterSanctuary();
                onNavigateTab("write");
              }}
              className="inline-flex items-center gap-1.5 px-space-sm py-1.5 rounded-lg font-ui-label-md text-ui-label-md text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all"
            >
              <span className="material-symbols-outlined text-[17px]">
                help_outline
              </span>
              <span>첫 편지 부치는 법 둘러보기</span>
            </button>
          </div>
        </div>

        {/* Notification Toast */}
        {showToast && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-inverse-surface text-inverse-on-surface px-space-md py-space-xs rounded-lg shadow-xl font-body-sm text-body-sm flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-[18px] text-secondary-container">
              check_circle
            </span>
            <span>
              환영 서신이 [나의 서재 &gt; 소장 서신]에 정성껏 갈무리되었습니다.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
