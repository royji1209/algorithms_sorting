"use client";

import React, { useEffect, useRef, useState } from "react";

export interface CelestialCardItem {
  tag: string;
  badge: string;
  content: string;
  recipient: string;
  status: string;
  isMine: boolean;
}

/**
 * 시간 기반 자동 분기 헬퍼 함수 (단위 테스트에서도 직접 검증 가능)
 * 21:00 ~ 04:00 (hour >= 21 || hour < 4) -> 'night' (page_9)
 * 04:00 ~ 21:00 (4 <= hour < 21) -> 'day' (page_10)
 */
export function resolveNightSkyModeByHour(hour: number): "night" | "day" {
  return hour >= 21 || hour < 4 ? "night" : "day";
}

export const SLOT_CYCLE_DURATIONS_MS = [8500, 9800, 9100, 10200] as const;
export const FADE_DURATION_MS = 1800;

interface NightSkyPostOfficeViewProps {
  userWarmthNote?: string;
  adminNightWindowEnabled?: boolean;
  onNavigateTab: (tab: "mailbox" | "write" | "library" | "night-sky" | "admin") => void;
}

export default function NightSkyPostOfficeView({
  userWarmthNote,
  adminNightWindowEnabled = true,
  onNavigateTab,
}: NightSkyPostOfficeViewProps) {
  // 초기 모드는 현재 시각(new Date().getHours()) 기준 자동 판별
  const [mode, setMode] = useState<"night" | "day">(() =>
    resolveNightSkyModeByHour(new Date().getHours())
  );
  const [isManualOverride, setIsManualOverride] = useState<boolean>(false);

  // 실시간 시계 및 카운트다운 상태
  const [nowTime, setNowTime] = useState<Date>(() => new Date());

  // 야간 화면 필터: 'all' | 'mine'
  const [orbitFilter, setOrbitFilter] = useState<"all" | "mine">("all");

  // 4개 슬롯의 현재 인덱스, 페이드 상태, 호버 일시정지 상태
  const [slotPoolIndices, setSlotPoolIndices] = useState<[number, number, number, number]>([
    0, 0, 0, 0,
  ]);
  const [slotFading, setSlotFading] = useState<[boolean, boolean, boolean, boolean]>([
    false,
    false,
    false,
    false,
  ]);
  const [slotHovered, setSlotHovered] = useState<[boolean, boolean, boolean, boolean]>([
    false,
    false,
    false,
    false,
  ]);

  // 카드 클릭 시 전문 읽기 모달
  const [selectedLanternCard, setSelectedLanternCard] =
    useState<CelestialCardItem | null>(null);

  // 주간 화면 21:00 개장 알림 신청 상태
  const [notifyEmail, setNotifyEmail] = useState<string>("");
  const [notifySuccess, setNotifySuccess] = useState<boolean>(false);

  const slotHoveredRef = useRef(slotHovered);
  slotHoveredRef.current = slotHovered;

  const slotFadingRef = useRef(slotFading);
  slotFadingRef.current = slotFading;

  const orbitFilterRef = useRef(orbitFilter);
  orbitFilterRef.current = orbitFilter;

  // 관리자 콘솔에서 심야 한정 개장 토글 변경 시 반영 (수동 미리보기 아닐 때)
  useEffect(() => {
    if (!isManualOverride) {
      if (!adminNightWindowEnabled) {
        setMode("day");
      } else {
        setMode(resolveNightSkyModeByHour(new Date().getHours()));
      }
    }
  }, [adminNightWindowEnabled, isManualOverride]);

  // 1초 단위 실시간 카운트다운 타이머
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 4개 슬롯의 문학 편지 풀 (page_9.html 원본 데이터 + 사용자가 방금 띄운 온기 반영)
  const slotPools: [
    CelestialCardItem[],
    CelestialCardItem[],
    CelestialCardItem[],
    CelestialCardItem[]
  ] = [
    // Slot 1: User's Letters & Sincere Responses (8.5s cycle)
    [
      {
        tag: "나의 온기 쪽지",
        badge: "대기 순번 #019",
        content: userWarmthNote
          ? `"${userWarmthNote}"`
          : '"마음에 닿아 기쁩니다. 바람이 차가워지는 밤, 당신의 방 안은 온기로 가득하길 바랍니다."',
        recipient: "11월 12일의 답장 이웃 앞",
        status: "유영 중",
        isMine: true,
      },
      {
        tag: "자정의 답장",
        badge: "대기 순번 #035",
        content:
          '"건네주신 국화차 향기 같은 문장이 식지 않고 머뭅니다. 편안한 잠자리가 되시기를 소망합니다."',
        recipient: "초겨울 창가에서 온 답장",
        status: "유영 중",
        isMine: true,
      },
      {
        tag: "나의 온기 쪽지",
        badge: "대기 순번 #062",
        content:
          '"보내주신 온기 덕분에 오늘의 무거웠던 마음을 조금 덜어냈습니다. 내일도 다정한 아침 맞이하세요."',
        recipient: "별을 세던 이웃 앞",
        status: "궤도 순항",
        isMine: true,
      },
    ],
    // Slot 2: Grateful Thoughts & Anonymous Warm Letters (9.8s cycle)
    [
      {
        tag: "짧은 감사 쪽지",
        badge: "대기 순번 #084",
        content:
          '"당신의 계절도 평온하길. 건네주신 한 줄의 시 덕분에 오늘의 불안을 조금 내려놓았습니다."',
        recipient: "바다 건너 전해질 온기",
        status: "자정 전달 예정",
        isMine: false,
      },
      {
        tag: "조용한 책갈피",
        badge: "대기 순번 #097",
        content:
          '"서두르지 않아도 괜찮습니다. 계절은 천천히 지나가고, 당신의 꽃도 알맞은 때에 필 테니까요."',
        recipient: "꿈을 가꾸는 이웃에게",
        status: "자정 전달 대기",
        isMine: false,
      },
      {
        tag: "새벽 안부 편지",
        badge: "대기 순번 #105",
        content:
          '"따뜻한 차 한 잔의 온기가 당신에게 닿았으면 합니다. 식지 않는 다정이 머물길 바라며."',
        recipient: "달빛을 걷는 이웃 앞",
        status: "별빛 순항 중",
        isMine: false,
      },
    ],
    // Slot 3: Anonymous Autumn Sentiments & Comfort (9.1s cycle)
    [
      {
        tag: "익명의 가을 편지",
        badge: "익명",
        content:
          '"오늘 퇴근길에 마주친 바람이 낯설지 않았습니다. 모두 저마다의 계절을 견디는 중이겠지요."',
        recipient: "서울 어딘가의 이웃 앞",
        status: "별빛 순항 중",
        isMine: false,
      },
      {
        tag: "먼 바다의 온기",
        badge: "익명",
        content:
          '"파도 소리를 담아 적습니다. 오늘 밤은 부디 모든 무거운 생각을 내려놓고 깊은 잠에 드시기를."',
        recipient: "동해 바닷가 우체통 발송",
        status: "밤하늘 유영 중",
        isMine: false,
      },
      {
        tag: "작은 다독임",
        badge: "익명",
        content:
          '"오늘 하루도 참 많이 애쓰셨습니다. 수고했던 당신의 양 어깨 위에 고요한 위로를 내려놓습니다."',
        recipient: "퇴근길 버스 창가의 당신",
        status: "자정 전달 대기",
        isMine: false,
      },
    ],
    // Slot 4: Classic Korean Poetry Literary Bookmarks (10.2s cycle)
    [
      {
        tag: "오늘의 시 낭독 조각",
        badge: "책갈피",
        content:
          '"별 하나에 추억과, 별 하나에 사랑과, 별 하나에 쓸쓸함과, 별 하나에 시와..."',
        recipient: "윤동주 · 별 헤는 밤 발췌",
        status: "시선 머묾",
        isMine: false,
      },
      {
        tag: "오늘의 시 낭독 조각",
        badge: "책갈피",
        content:
          '"별을 노래하는 마음으로 모든 죽어가는 것을 사랑해야지. 그리고 나한테 주어진 길을 걸어가야겠다."',
        recipient: "윤동주 · 서시 발췌",
        status: "시선 머묾",
        isMine: false,
      },
      {
        tag: "오늘의 시 낭독 조각",
        badge: "책갈피",
        content:
          '"산에는 꽃 피네 꽃이 피네. 갈 봄 여름 없이 꽃이 피네. 산에 산에 피는 꽃은 저만치 혼자서 피어 있네."',
        recipient: "김소월 · 산유화 발췌",
        status: "시선 머묾",
        isMine: false,
      },
    ],
  ];

  // 야간 모드일 때 4개 슬롯의 독립적인 비동기 순환 타이머 (8.5s, 9.8s, 9.1s, 10.2s + 1.8s 페이드아웃/페이드인)
  useEffect(() => {
    if (mode !== "night") return;

    const intervalIds: Array<ReturnType<typeof setInterval>> = [];
    const startupTimeouts: Array<ReturnType<typeof setTimeout>> = [];

    [0, 1, 2, 3].forEach((slotIdx) => {
      const startTimeout = setTimeout(() => {
        const interval = setInterval(() => {
          // 마우스 호버 중이거나 페이드 중이거나 '내가 띄운 온기' 단독 필터일 때는 일시정지
          if (
            slotHoveredRef.current[slotIdx] ||
            slotFadingRef.current[slotIdx] ||
            orbitFilterRef.current === "mine"
          ) {
            return;
          }

          // 1.8초 페이드아웃 시작
          setSlotFading((prev) => {
            const next = [...prev] as [boolean, boolean, boolean, boolean];
            next[slotIdx] = true;
            return next;
          });

          setTimeout(() => {
            // 다음 편지로 교체 후 페이드인
            setSlotPoolIndices((prev) => {
              const next = [...prev] as [number, number, number, number];
              next[slotIdx] = (next[slotIdx] + 1) % 3;
              return next;
            });

            setSlotFading((prev) => {
              const next = [...prev] as [boolean, boolean, boolean, boolean];
              next[slotIdx] = false;
              return next;
            });
          }, FADE_DURATION_MS);
        }, SLOT_CYCLE_DURATIONS_MS[slotIdx]);

        intervalIds.push(interval);
      }, slotIdx * 1200);

      startupTimeouts.push(startTimeout);
    });

    return () => {
      startupTimeouts.forEach(clearTimeout);
      intervalIds.forEach(clearInterval);
    };
  }, [mode]);

  // 자정(24:00)까지 남은 시간 계산 (야간 모드용)
  const midnightTarget = new Date(nowTime);
  midnightTarget.setHours(24, 0, 0, 0);
  const midnightDiffMs = Math.max(0, midnightTarget.getTime() - nowTime.getTime());
  const midnightHrs = String(
    Math.floor((midnightDiffMs / (1000 * 60 * 60)) % 24)
  ).padStart(2, "0");
  const midnightMins = String(
    Math.floor((midnightDiffMs / (1000 * 60)) % 60)
  ).padStart(2, "0");
  const midnightSecs = String(Math.floor((midnightDiffMs / 1000) % 60)).padStart(
    2,
    "0"
  );

  // 21:00 개장까지 남은 시간 계산 (주간 모드용)
  const openingTarget = new Date(nowTime);
  openingTarget.setHours(21, 0, 0, 0);
  if (openingTarget.getTime() <= nowTime.getTime()) {
    openingTarget.setDate(openingTarget.getDate() + 1);
  }
  const openingDiffMs = Math.max(0, openingTarget.getTime() - nowTime.getTime());
  const openingTotalSec = Math.floor(openingDiffMs / 1000);
  const openingHrs = String(Math.floor(openingTotalSec / 3600)).padStart(2, "0");
  const openingMins = String(Math.floor((openingTotalSec % 3600) / 60)).padStart(
    2,
    "0"
  );
  const openingSecs = String(openingTotalSec % 60).padStart(2, "0");

  const kstDisplayStr = `${String(nowTime.getHours()).padStart(2, "0")}:${String(
    nowTime.getMinutes()
  ).padStart(2, "0")}:${String(nowTime.getSeconds()).padStart(2, "0")}`;

  const handleTogglePreviewMode = () => {
    setIsManualOverride(true);
    setMode((prev) => (prev === "night" ? "day" : "night"));
  };

  return (
    <div data-testid="night-sky-post-office-view" className="flex flex-col w-full">
      {/* =====================================================================
          상단 시연/테스트용 [야간 개장 / 주간 잠금 모드 미리보기 전환] 토글 배너
         ===================================================================== */}
      <div className="w-full bg-[#131B2E] border-b border-[#F4C96B]/30 text-slate-100 px-4 py-2.5">
        <div className="max-w-[1100px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-[#F4C96B]/20 text-[#F4C96B] font-semibold">
              실시간 자동 분기 작동 중 (현재 {kstDisplayStr})
            </span>
            <span className="text-slate-300">
              현재 표시 화면:{" "}
              <strong className="text-[#F4C96B]">
                {mode === "night"
                  ? "야간 개장 모드 (21:00~04:00 밤하늘 유영 궤도 · page_9)"
                  : "주간 잠금 모드 (04:00~21:00 낮의 휴식 잠금 & 카운트다운 · page_10)"}
              </strong>
            </span>
          </div>
          <button
            type="button"
            data-testid="toggle-night-day-preview-btn"
            onClick={handleTogglePreviewMode}
            className="px-3.5 py-1.5 rounded-full bg-[#F4C96B] hover:bg-[#D99B38] text-[#131B2E] font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm shrink-0"
          >
            <span className="material-symbols-outlined text-[15px]">
              swap_horiz
            </span>
            <span>
              [야간 개장 / 주간 잠금 모드 미리보기 전환] (
              {mode === "night" ? "주간 잠금 화면 보기" : "야간 개장 화면 보기"})
            </span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          MODE A: page_9.html — 야간 개장 화면 (밤하늘 유영 궤도 21:00 ~ 04:00)
         ===================================================================== */}
      {mode === "night" ? (
        <>
          <section
            data-testid="night-sky-orbit-stage"
            className="relative w-full overflow-hidden text-slate-100 py-space-xl px-4 sm:px-gutter"
            style={{
              background:
                "linear-gradient(180deg, #131B2E 0%, #172138 55%, #1D2942 100%)",
            }}
          >
            {/* Star & Celestial Particle Atmosphere Background with Warm Ginkgo Gold (#F4C96B & #D99B38) */}
            <div className="absolute inset-0 pointer-events-none opacity-60">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient cx="50%" cy="25%" id="skyGlow" r="65%">
                    <stop offset="0%" stopColor="#F4C96B" stopOpacity="0.14" />
                    <stop offset="30%" stopColor="#D99B38" stopOpacity="0.08" />
                    <stop offset="70%" stopColor="#B84A39" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#131B2E" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <rect fill="url(#skyGlow)" height="100%" width="100%" />
                <circle cx="12%" cy="18%" fill="#F4C96B" opacity="0.85" r="1.2" />
                <circle cx="28%" cy="14%" fill="#F4C96B" opacity="0.9" r="1.5" />
                <circle cx="36%" cy="28%" fill="#FFFDF9" opacity="0.5" r="1" />
                <circle cx="48%" cy="12%" fill="#D99B38" opacity="0.75" r="1.8" />
                <circle cx="68%" cy="18%" fill="#F4C96B" opacity="0.85" r="1.6" />
                <circle cx="82%" cy="24%" fill="#D99B38" opacity="0.7" r="1.5" />
                <circle cx="91%" cy="12%" fill="#F4C96B" opacity="0.95" r="2.2" />
                <circle cx="18%" cy="62%" fill="#FFFDF9" opacity="0.5" r="1.2" />
                <circle cx="75%" cy="68%" fill="#F4C96B" opacity="0.65" r="1.4" />
                <circle cx="88%" cy="78%" fill="#D99B38" opacity="0.6" r="1.2" />
                <path
                  d="M 150 120 Q 420 70, 780 150 T 1150 95"
                  fill="none"
                  stroke="#F4C96B"
                  strokeDasharray="3 7"
                  strokeOpacity="0.25"
                />
              </svg>
            </div>

            <div className="relative max-w-[1100px] mx-auto flex flex-col gap-space-lg">
              {/* Top Midnight Protocol Notice Banner */}
              <div className="w-full flex items-center justify-between flex-wrap gap-2 px-4 py-2.5 rounded-xl bg-slate-900/60 border border-[#F4C96B]/25 backdrop-blur-md text-xs sm:text-sm">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#F4C96B]/15 text-[#F4C96B] font-ui-label-sm font-semibold tracking-wider border border-[#F4C96B]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F4C96B] animate-pulse" />
                    심야 개장 운영 중
                  </span>
                  <span className="text-slate-200 font-body-sm">
                    심야 한정 개장 구역 · 매일 밤{" "}
                    <strong className="text-[#F4C96B] font-semibold">
                      21:00
                    </strong>{" "}
                    — 새벽{" "}
                    <strong className="text-[#F4C96B] font-semibold">
                      04:00
                    </strong>
                    에만 열리는 별빛 우편 궤도
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-300/80 font-caption text-caption">
                  <span className="material-symbols-outlined text-[15px] text-[#F4C96B]">
                    nights_stay
                  </span>
                  <span>21:00~04:00 개장 규약 적용</span>
                </div>
              </div>

              {/* Midnight Countdown & Poetic Statement */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-2">
                <div className="space-y-space-xs max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/70 text-[#F4C96B] border border-[#F4C96B]/20 backdrop-blur-sm shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-[#F4C96B] animate-ping" />
                    <span className="font-ui-label-sm text-ui-label-sm tracking-widest text-[#F4C96B]">
                      밤하늘 우편국 유영 궤도
                    </span>
                    <span className="text-xs opacity-60">|</span>
                    <span className="font-ui-label-sm text-ui-label-sm text-slate-300">
                      전달 대기 중인 고요한 마음들
                    </span>
                  </div>
                  <p className="font-body-md text-body-md text-slate-300 leading-relaxed pt-space-xs">
                    띄워보낸 온기들은 밤하늘 별빛 사이를 천천히 유영하다,
                    <br className="hidden md:inline" /> 자정의 종소리와 함께
                    상대방의 고요한 우편함으로 조용히 내려앉습니다.
                  </p>
                </div>

                {/* Live Midnight Timer Capsule */}
                <div className="bg-slate-900/60 border border-[#F4C96B]/20 backdrop-blur-md px-space-md py-space-sm rounded-xl flex flex-col items-start md:items-end shadow-md">
                  <div className="flex items-center gap-space-xs font-ui-label-sm text-ui-label-sm text-[#F4C96B] tracking-wider">
                    <span className="material-symbols-outlined text-[15px] text-[#F4C96B]">
                      bedtime
                    </span>
                    <span>자정(24:00) 발송까지 남은 침묵</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1 font-headline-lg text-headline-lg tracking-tight text-white">
                    <span id="countdown-hours">{midnightHrs}</span>
                    <span className="text-[#F4C96B] font-caption text-caption opacity-80">
                      시
                    </span>
                    <span id="countdown-minutes">{midnightMins}</span>
                    <span className="text-[#F4C96B] font-caption text-caption opacity-80">
                      분
                    </span>
                    <span
                      className="text-[#F4C96B] font-semibold"
                      id="countdown-seconds"
                    >
                      {midnightSecs}
                    </span>
                    <span className="text-[#F4C96B] font-caption text-caption opacity-80">
                      초
                    </span>
                  </div>
                  <span className="font-caption text-caption text-slate-400 mt-0.5">
                    상대방의 수면을 방해하지 않는 심야 규약
                  </span>
                </div>
              </div>

              {/* Starlit Celestial Observatory Stage */}
              <div className="relative w-full rounded-2xl bg-slate-900/40 border border-[#F4C96B]/15 backdrop-blur-lg p-space-md md:p-space-lg shadow-2xl overflow-hidden min-h-[530px] flex flex-col justify-between">
                {/* Filter Bar inside canvas */}
                <div className="flex flex-wrap items-center justify-between gap-space-sm z-10">
                  <div className="inline-flex p-1 rounded-full bg-slate-950/70 border border-[#F4C96B]/20 shadow-inner">
                    <button
                      type="button"
                      id="filter-all"
                      onClick={() => setOrbitFilter("all")}
                      className={`px-space-md py-1.5 rounded-full font-ui-label-sm text-ui-label-sm transition-all ${
                        orbitFilter === "all"
                          ? "text-[#131B2E] font-semibold bg-[#F4C96B] shadow-sm"
                          : "text-slate-300 hover:text-white"
                      }`}
                    >
                      밤하늘 전체 유영 (142통의 온기)
                    </button>
                    <button
                      type="button"
                      id="filter-mine"
                      onClick={() => setOrbitFilter("mine")}
                      className={`px-space-md py-1.5 rounded-full font-ui-label-sm text-ui-label-sm transition-all ${
                        orbitFilter === "mine"
                          ? "text-[#131B2E] font-semibold bg-[#F4C96B] shadow-sm"
                          : "text-slate-300 hover:text-white"
                      }`}
                    >
                      내가 띄운 온기 (1)
                    </button>
                  </div>

                  <div className="hidden sm:flex items-center gap-space-xs font-caption text-caption text-slate-300">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#F4C96B] shadow-[0_0_8px_#F4C96B]" />
                    <span>
                      개별 별빛 궤도 순환 중 (8.5s / 9.8s / 9.1s / 10.2s 자율 주기)
                    </span>
                    <span className="text-xs text-slate-400 ml-1">
                      · 마우스를 올리면 순환이 멈추고 전문을 읽을 수 있습니다
                    </span>
                  </div>
                </div>

                {/* 2x2 Non-overlapping Spatial Slots */}
                <div className="relative w-full my-auto py-4">
                  <div
                    className="absolute inset-0 m-auto w-[90%] h-[320px] rounded-full opacity-25 pointer-events-none rotate-[-4deg]"
                    style={{
                      background:
                        "radial-gradient(ellipse at center, rgba(244, 201, 107, 0.22) 0%, rgba(217, 155, 56, 0.08) 45%, rgba(19, 27, 46, 0) 72%)",
                    }}
                  />

                  <div
                    className="relative grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-7 w-full max-w-[980px] mx-auto z-10"
                    id="celestial-canvas-stage"
                  >
                    {[0, 1, 2, 3].map((slotIdx) => {
                      const currentCard =
                        slotPools[slotIdx][slotPoolIndices[slotIdx]];
                      const isFadingOut =
                        slotFading[slotIdx] ||
                        (orbitFilter === "mine" && slotIdx !== 0);
                      const floatClass =
                        slotIdx === 0
                          ? "animate-float-1"
                          : slotIdx === 1
                          ? "animate-float-2"
                          : slotIdx === 2
                          ? "animate-float-3"
                          : "animate-float-4";

                      return (
                        <div
                          key={slotIdx}
                          id={`celestial-slot-${slotIdx + 1}`}
                          data-slot={slotIdx}
                          onMouseEnter={() => {
                            setSlotHovered((prev) => {
                              const next = [...prev] as [
                                boolean,
                                boolean,
                                boolean,
                                boolean
                              ];
                              next[slotIdx] = true;
                              return next;
                            });
                          }}
                          onMouseLeave={() => {
                            setSlotHovered((prev) => {
                              const next = [...prev] as [
                                boolean,
                                boolean,
                                boolean,
                                boolean
                              ];
                              next[slotIdx] = false;
                              return next;
                            });
                          }}
                          onClick={() => setSelectedLanternCard(currentCard)}
                          className={`celestial-card-wrapper ${floatClass} group cursor-pointer ${
                            isFadingOut ? "celestial-fade-out" : "celestial-fade-in"
                          }`}
                        >
                          <div
                            id={`card-inner-${slotIdx + 1}`}
                            className="celestial-card-inner relative p-4 rounded-xl bg-[#FFFDF9] text-on-surface shadow-[0_6px_22px_rgba(19,27,46,0.35)] border border-[#dec0bb]/70 backdrop-blur-md"
                          >
                            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-surface-container/60">
                              <span
                                className={`inline-flex items-center gap-1.5 font-ui-label-sm text-ui-label-sm font-semibold ${
                                  slotIdx === 0 || slotIdx === 3
                                    ? "text-[#B84A39]"
                                    : slotIdx === 2
                                    ? "text-secondary"
                                    : "text-tertiary"
                                }`}
                              >
                                {currentCard.isMine && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#B84A39] animate-pulse" />
                                )}
                                <span>{currentCard.tag}</span>
                              </span>
                              <span className="font-caption text-caption text-tertiary font-mono">
                                {currentCard.badge}
                              </span>
                            </div>

                            <p className="font-body-md text-body-md text-on-surface leading-relaxed min-h-[54px] select-none">
                              {currentCard.content}
                            </p>

                            <div className="mt-2.5 pt-1.5 border-t border-surface-container/60 flex items-center justify-between font-caption text-caption text-tertiary">
                              <span className="truncate max-w-[65%]">
                                {currentCard.recipient}
                              </span>
                              <span className="text-[#B84A39] font-medium shrink-0">
                                {slotHovered[slotIdx]
                                  ? "일시정지됨 (호버)"
                                  : currentCard.status}
                              </span>
                            </div>

                            {/* Hover Reading Badge in Warm Ginkgo Gold */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-[#F4C96B] text-[#131B2E] font-ui-label-sm text-ui-label-sm font-semibold shadow-md flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">
                                visibility
                              </span>
                              <span>클릭하여 전문 읽기</span>
                            </div>
                          </div>

                          {/* Lantern String and Warm Ginkgo Gold Glowing Beacon */}
                          <div className="flex flex-col items-center">
                            <div className="w-0.5 h-4 bg-[#F4C96B]/60" />
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{
                                backgroundColor:
                                  slotIdx % 2 === 0 ? "#F4C96B" : "#D99B38",
                                boxShadow:
                                  slotIdx % 2 === 0
                                    ? "0 0 12px #F4C96B"
                                    : "0 0 10px #D99B38",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sky Canvas Bottom Status strip */}
                <div className="pt-space-sm flex flex-col sm:flex-row items-center justify-between gap-space-sm text-slate-300 font-caption text-caption z-10 border-t border-slate-700/50">
                  <div className="flex items-center gap-space-md">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#F4C96B] animate-pulse" />
                      등불 온기 고도: 성층권 12,000m 고요 구역
                    </span>
                    <span className="hidden sm:inline text-slate-500">|</span>
                    <span className="hidden sm:inline">
                      실시간 밤바람 속도: 1.2 knot (미풍)
                    </span>
                  </div>
                  <div className="text-[#F4C96B] flex items-center gap-2">
                    <span className="text-slate-200">
                      수신인 알림: 2026. 11. 18 24:00 정각
                    </span>
                    <span
                      id="orbit-cycle-badge"
                      className="hidden md:inline px-2 py-0.5 rounded-full bg-slate-800/80 border border-[#F4C96B]/30 font-ui-label-sm text-ui-label-sm text-[#F4C96B]"
                    >
                      {orbitFilter === "mine"
                        ? "나의 온기 쪽지 단독 유영"
                        : "자율 궤도 비행 중"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Physical Editorial Paper Sheet & Delivery Status Details */}
          <section className="w-full bg-surface py-space-xl px-4 sm:px-gutter">
            <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
              {/* Left Column: Postal Manifest & Tonight's Metric */}
              <div className="lg:col-span-5 flex flex-col gap-space-md">
                <div className="p-space-lg rounded-2xl bg-surface-container-low shadow-sm border border-outline-variant/25">
                  <div className="flex items-center justify-between pb-space-sm">
                    <div className="space-y-0.5">
                      <span className="font-ui-label-sm text-ui-label-sm text-secondary uppercase tracking-widest">
                        Postal Manifest
                      </span>
                      <h2 className="font-headline-md text-headline-md text-on-surface">
                        오늘 밤 발송 현황
                      </h2>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center">
                      <span className="material-symbols-outlined text-on-secondary-fixed text-[20px]">
                        local_shipping
                      </span>
                    </div>
                  </div>
                  <p className="font-body-sm text-body-sm text-tertiary mt-space-xs leading-relaxed">
                    여백의 우체통은 &lsquo;느린 전달의 미학&rsquo;을 지킵니다.
                    즉각적인 알림의 피로를 덜어내기 위해 모든 편지는 고요한 밤
                    자정에 일괄 도착합니다.
                  </p>

                  {/* SVG Visual Donut Gauge */}
                  <div className="mt-space-md pt-space-md flex items-center gap-space-md">
                    <div className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center">
                      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-surface-container-highest stroke-current"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          strokeWidth="3.5"
                        />
                        <path
                          className="text-primary stroke-current transition-all duration-1000 ease-out"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          strokeDasharray="100, 100"
                          strokeLinecap="round"
                          strokeWidth="3.5"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="font-headline-md text-headline-md text-primary font-semibold leading-none">
                          100
                        </span>
                        <span className="font-ui-label-sm text-ui-label-sm text-tertiary mt-0.5">
                          %
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-ui-label-md text-ui-label-md text-on-surface font-medium">
                        자정 일괄 전달 보장
                      </span>
                      <span className="font-body-sm text-body-sm text-tertiary">
                        밤하늘 유영 대기율 완결
                      </span>
                      <span className="font-caption text-caption text-secondary font-medium">
                        훼손 방지 밀랍 디지털 봉인 완료
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-space-sm mt-space-md pt-space-md">
                    <div className="p-space-sm rounded-xl bg-surface-container-lowest shadow-sm flex flex-col">
                      <span className="font-caption text-caption text-tertiary">
                        띄워진 온기
                      </span>
                      <span className="font-headline-md text-headline-md text-on-surface mt-1">
                        142
                        <span className="font-body-sm text-body-sm text-tertiary font-normal ml-1">
                          통
                        </span>
                      </span>
                    </div>
                    <div className="p-space-sm rounded-xl bg-surface-container-lowest shadow-sm flex flex-col">
                      <span className="font-caption text-caption text-tertiary">
                        평균 음미 시간
                      </span>
                      <span className="font-headline-md text-headline-md text-secondary mt-1">
                        4.8
                        <span className="font-body-sm text-body-sm text-tertiary font-normal ml-1">
                          분
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: My Transit Letter Certificate & Wax Seal */}
              <div className="lg:col-span-7 flex flex-col gap-space-md">
                <div className="p-space-lg rounded-2xl bg-surface-container-lowest shadow-[0_4px_20px_rgba(45,36,30,0.06)] relative overflow-hidden border border-outline-variant/25">
                  <div className="flex flex-wrap items-center justify-between gap-space-xs pb-space-md">
                    <div className="flex items-center gap-space-xs">
                      <span className="font-ui-label-sm text-ui-label-sm px-2.5 py-1 rounded bg-secondary-fixed text-on-secondary-fixed font-semibold tracking-wider">
                        SEOUL POST NO. 1118-WARM-402
                      </span>
                      <span className="font-caption text-caption text-tertiary">
                        정기 야간 편람
                      </span>
                    </div>
                    <div className="px-3 py-1 rounded bg-surface-container-high text-tertiary font-ui-label-sm text-ui-label-sm tracking-widest uppercase">
                      2026. 11. 18 • MIDNIGHT COURIER
                    </div>
                  </div>

                  <div className="my-space-md pl-space-md relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-container/30 rounded-full" />
                    <span className="font-ui-label-sm text-ui-label-sm text-primary tracking-widest block mb-space-xs">
                      수신: 11월 12일의 답장 이웃에게
                    </span>
                    <p className="font-body-lg text-base sm:text-body-lg text-on-surface leading-loose">
                      &ldquo;
                      {userWarmthNote ||
                        "마음에 닿아 기쁩니다. 바람이 차가워지는 밤, 당신의 방 안은 온기로 가득하길 바랍니다. 보내주신 찻잔 그림과 짧은 문장이 오늘 하루 종일 지친 발걸음에 다정한 등불이 되어주었습니다. 부디 내일 아침 눈을 떴을 때, 어제보다 한결 가벼운 마음으로 창문을 열 수 있기를 소망합니다."}
                      &rdquo;
                    </p>
                    <div className="mt-space-md flex items-center justify-between text-tertiary font-body-sm text-body-sm">
                      <span>띄운 사람: 늦은 가을의 서재로부터</span>
                      <span>글자 수: 148자 • 음미 시간 1분</span>
                    </div>
                  </div>

                  <div className="mt-space-lg pt-space-md bg-surface-container-low/60 rounded-xl p-space-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
                    <div className="flex items-center gap-space-md">
                      <div className="w-14 h-14 rounded-full bg-primary-container flex-shrink-0 flex items-center justify-center shadow-[0_4px_12px_rgba(184,74,57,0.4)] text-on-primary">
                        <span className="material-symbols-outlined text-[26px]">
                          eco
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="font-ui-label-md text-ui-label-md text-on-surface font-semibold">
                          밤하늘 유영 안심 규약
                        </span>
                        <p className="font-caption text-caption text-tertiary">
                          자정 전까지 밤하늘에 고이 머무르며, 서로의 밤을 방해하지
                          않는 고요한 규칙입니다.
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="font-ui-label-sm text-ui-label-sm text-primary font-medium block">
                        회수 및 취소 불가
                      </span>
                      <span className="font-caption text-caption text-tertiary">
                        별빛 궤도 진입 완료
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Center */}
                <div className="p-space-md rounded-2xl bg-surface-container flex flex-col sm:flex-row items-center justify-between gap-space-md shadow-sm">
                  <div className="flex items-center gap-space-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[22px]">
                      history_edu
                    </span>
                    <span className="font-body-sm text-body-sm">
                      오늘 밤, 못다 전한 다른 다정한 문장이 남아있나요?
                    </span>
                  </div>
                  <div className="flex items-center gap-space-sm w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => onNavigateTab("library")}
                      className="flex-1 sm:flex-initial text-center px-space-md py-2.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm transition-colors shadow-sm"
                    >
                      나의 서재로 가기
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateTab("write")}
                      className="flex-1 sm:flex-initial text-center px-space-md py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-body-sm text-body-sm transition-colors shadow-md flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        edit_note
                      </span>
                      <span>온기 한 줄 더 띄우기</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 등불 카드 클릭 시 전문 읽기 모달 */}
          {selectedLanternCard && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#131B2E]/75 backdrop-blur-sm">
              <div className="w-full max-w-[520px] rounded-2xl bg-[#FFFDF9] p-6 sm:p-8 shadow-2xl border border-[#F4C96B]/50 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
                  <span className="text-xs font-semibold text-primary">
                    {selectedLanternCard.tag} · {selectedLanternCard.badge}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedLanternCard(null)}
                    className="text-tertiary hover:text-on-surface"
                  >
                    ✕
                  </button>
                </div>
                <p className="font-body-lg text-base sm:text-lg text-on-surface leading-relaxed">
                  {selectedLanternCard.content}
                </p>
                <div className="flex items-center justify-between text-xs text-tertiary pt-2 border-t border-outline-variant/25">
                  <span>수신: {selectedLanternCard.recipient}</span>
                  <span className="text-primary font-medium">
                    {selectedLanternCard.status}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* =====================================================================
           MODE B: page_10.html — 주간 잠금 화면 (낮의 휴식 시간 잠금 & 21:00 개장 카운트다운)
           ===================================================================== */
        <div
          data-testid="daytime-lock-stage"
          className="relative w-full overflow-hidden"
        >
          <div className="max-w-[1100px] mx-auto px-4 sm:px-gutter py-space-xl relative z-10">
            {/* 1. Header Notice */}
            <div className="flex flex-col items-center text-center mb-space-xl">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container text-tertiary shadow-sm mb-space-md flex-wrap justify-center">
                <span className="inline-block w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <span className="font-ui-label-sm text-ui-label-sm tracking-wider uppercase text-on-surface-variant">
                  낮의 휴식 시간 · 밤을 기다리는 우체국
                </span>
                <span className="text-tertiary-fixed-dim">|</span>
                <span className="font-caption text-caption text-tertiary">
                  정기 운영 21:00 — 04:00 KST
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-tertiary max-w-lg leading-relaxed">
                밤하늘 우체국은 매일 밤{" "}
                <span className="text-primary font-medium">
                  21:00부터 새벽 04:00
                </span>
                까지,
                <br className="hidden sm:inline" /> 세상이 깊이 잠들고 별빛이
                맑아지는 시간에만 고요히 문을 엽니다.
              </p>
            </div>

            {/* 2. Hero Lock & Sanctuary Card */}
            <section className="relative bg-surface-container-lowest shadow-xl rounded-xl p-6 sm:p-8 md:p-12 mb-space-xl overflow-hidden border border-outline-variant/25">
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-center">
                {/* Visual Column: Closed Wooden Shutter & Brass Lock Metaphor */}
                <div className="lg:col-span-5 flex flex-col items-center">
                  <div className="relative w-full max-w-[340px] aspect-[4/5] rounded-lg bg-surface-container-high shadow-inner overflow-hidden flex flex-col items-center justify-between p-6">
                    <div className="relative w-full flex justify-between items-start text-tertiary/70">
                      <div className="font-ui-label-sm text-ui-label-sm tracking-widest border-b border-tertiary/30 pb-0.5">
                        POSTE DE NUIT
                      </div>
                      <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary shadow-sm">
                        <span className="material-symbols-outlined text-[20px]">
                          nightlight
                        </span>
                      </div>
                    </div>

                    {/* Wax-Sealed Brass Keyhole Emblem */}
                    <div className="relative my-auto flex flex-col items-center">
                      <div className="relative w-28 h-28 rounded-full bg-primary-container shadow-lg flex items-center justify-center text-on-primary-container">
                        <div className="w-24 h-24 rounded-full bg-primary flex flex-col items-center justify-center text-on-primary shadow-inner">
                          <span className="material-symbols-outlined text-[34px] mb-0.5">
                            lock_clock
                          </span>
                          <span className="font-ui-label-sm text-[10px] tracking-widest uppercase">
                            SLEEPING
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 px-3 py-1 rounded bg-surface/80 backdrop-blur-sm shadow-sm flex items-center gap-1.5 text-on-surface-variant">
                        <span className="material-symbols-outlined text-[16px] text-secondary">
                          wb_sunny
                        </span>
                        <span className="font-ui-label-sm text-ui-label-sm">
                          낮 햇살 아래 봉인됨
                        </span>
                      </div>
                    </div>

                    <div className="relative w-full pt-3 border-t border-outline-variant/30 flex items-center justify-between text-tertiary font-ui-label-sm text-ui-label-sm">
                      <span>SEAL NO. 2100-0400</span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        야간 재개
                      </span>
                    </div>
                  </div>
                </div>

                {/* Literary Text & Countdown Column */}
                <div className="lg:col-span-7 flex flex-col justify-center space-y-space-md">
                  <div className="space-y-space-xs">
                    <span className="font-ui-label-sm text-ui-label-sm tracking-widest text-primary uppercase">
                      Waiting for Twilight
                    </span>
                    <h1 className="font-headline-lg text-2xl sm:text-headline-lg text-on-surface tracking-tight leading-snug">
                      지금은 햇살이 머무는 시간,
                      <br />
                      <span className="text-primary font-medium">
                        밤하늘 우편함
                      </span>
                      이 조용히 잠들어 있습니다.
                    </h1>
                  </div>
                  <p className="font-body-md text-body-md text-tertiary leading-relaxed">
                    마음속 못다 한 문장들을 가만히 품어두세요. 오늘 하루의
                    분주함이 사그라지고 밤 9시 첫 별이 뜨면, 고요한 별빛 궤도가
                    다시 열립니다.
                  </p>

                  {/* 3. Real-Time Countdown Module */}
                  <div className="bg-surface-container-low rounded-lg p-space-md shadow-sm border border-outline-variant/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-[20px]">
                          hourglass_top
                        </span>
                        <span className="font-title-md text-title-md text-on-surface">
                          오늘 밤 21:00 개장까지
                        </span>
                      </div>
                      <span
                        className="font-caption text-caption text-tertiary"
                        id="current-kst-display"
                      >
                        실시간 서울 기준 (KST {kstDisplayStr})
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center my-2">
                      <div className="bg-surface-container-lowest p-3 rounded shadow-sm">
                        <div
                          className="font-headline-lg text-xl sm:text-headline-lg text-secondary font-medium tracking-tight"
                          id="day-countdown-hours"
                        >
                          {openingHrs}
                        </div>
                        <div className="font-ui-label-sm text-ui-label-sm text-tertiary uppercase mt-1">
                          시간 (HRS)
                        </div>
                      </div>
                      <div className="bg-surface-container-lowest p-3 rounded shadow-sm">
                        <div
                          className="font-headline-lg text-xl sm:text-headline-lg text-secondary font-medium tracking-tight"
                          id="day-countdown-minutes"
                        >
                          {openingMins}
                        </div>
                        <div className="font-ui-label-sm text-ui-label-sm text-tertiary uppercase mt-1">
                          분 (MIN)
                        </div>
                      </div>
                      <div className="bg-surface-container-lowest p-3 rounded shadow-sm">
                        <div
                          className="font-headline-lg text-xl sm:text-headline-lg text-primary font-medium tracking-tight"
                          id="day-countdown-seconds"
                        >
                          {openingSecs}
                        </div>
                        <div className="font-ui-label-sm text-ui-label-sm text-tertiary uppercase mt-1">
                          초 (SEC)
                        </div>
                      </div>
                      <div className="bg-surface-container-lowest p-3 rounded shadow-sm flex flex-col justify-center items-center">
                        <span className="material-symbols-outlined text-secondary text-[24px]">
                          bedtime
                        </span>
                        <span className="font-ui-label-sm text-ui-label-sm text-tertiary mt-1">
                          야간 항해
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 flex flex-col gap-1.5">
                      <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-secondary-container via-secondary to-primary h-full rounded-full transition-all duration-1000"
                          style={{ width: "78.5%" }}
                        />
                      </div>
                      <div className="flex justify-between font-caption text-caption text-tertiary">
                        <span>낮의 여백 (04:00)</span>
                        <span className="text-on-surface-variant font-medium">
                          황혼 진입 중 (78%)
                        </span>
                        <span>개장 (21:00)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 4. 낮 동안 머물 수 있는 곳 (3 Navigation Cards) */}
            <section className="mb-space-xl">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-space-md gap-2">
                <div>
                  <span className="font-ui-label-sm text-ui-label-sm text-primary tracking-wider uppercase">
                    Daytime Sanctuary
                  </span>
                  <h2 className="font-headline-md text-headline-md text-on-surface">
                    낮 동안 머물 수 있는 곳
                  </h2>
                </div>
                <p className="font-body-sm text-body-sm text-tertiary">
                  문을 닫은 우체국 앞에서도, 사유와 기록의 시간은 계속 흐릅니다.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-md flex flex-col justify-between border border-outline-variant/25">
                  <div>
                    <div className="w-12 h-12 rounded-lg bg-primary-fixed/30 text-primary flex items-center justify-center mb-4">
                      <span className="material-symbols-outlined text-[26px]">
                        edit_note
                      </span>
                    </div>
                    <span className="font-ui-label-sm text-ui-label-sm text-tertiary uppercase tracking-wider">
                      임시 보관함 연동
                    </span>
                    <h3 className="font-title-md text-title-md text-on-surface mt-1 mb-2">
                      글쓰기 에디터로 가기
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mb-6">
                      밤에 띄워보낼 온기를 미리 적어두고 안전하게 임시
                      보관해두세요. 개장 즉시 첫 번째 우편선에 실립니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab("write")}
                    className="inline-flex items-center justify-center w-full px-4 py-3 bg-primary text-on-primary rounded font-ui-label-md text-ui-label-md hover:bg-primary-container transition-colors shadow-sm"
                  >
                    <span>온기 미리 적어두기</span>
                    <span className="material-symbols-outlined text-[16px] ml-1.5">
                      arrow_forward
                    </span>
                  </button>
                </div>

                <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-md flex flex-col justify-between border border-outline-variant/25">
                  <div>
                    <div className="w-12 h-12 rounded-lg bg-surface-container-high text-secondary flex items-center justify-center mb-4">
                      <span className="material-symbols-outlined text-[26px]">
                        shelves
                      </span>
                    </div>
                    <span className="font-ui-label-sm text-ui-label-sm text-tertiary uppercase tracking-wider">
                      지난 발자취
                    </span>
                    <h3 className="font-title-md text-title-md text-on-surface mt-1 mb-2">
                      나의 서재 둘러보기
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mb-6">
                      지난 계절 내가 주고받았던 따스한 답장과 익명의 문장들을
                      조용히 복기해보세요.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab("library")}
                    className="inline-flex items-center justify-center w-full px-4 py-3 bg-surface-container text-on-surface rounded font-ui-label-md text-ui-label-md hover:bg-surface-container-high transition-colors"
                  >
                    <span>서재 열기</span>
                    <span className="material-symbols-outlined text-[16px] ml-1.5">
                      local_library
                    </span>
                  </button>
                </div>

                <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-md flex flex-col justify-between border border-outline-variant/25">
                  <div>
                    <div className="w-12 h-12 rounded-lg bg-tertiary-fixed text-tertiary flex items-center justify-center mb-4">
                      <span className="material-symbols-outlined text-[26px]">
                        mark_email_unread
                      </span>
                    </div>
                    <span className="font-ui-label-sm text-ui-label-sm text-tertiary uppercase tracking-wider">
                      오늘의 큐레이션
                    </span>
                    <h3 className="font-title-md text-title-md text-on-surface mt-1 mb-2">
                      오늘 도착한 시 읽기
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mb-6">
                      낮의 번잡한 마음에 고요한 쉼표를 찍어줄 한 줄의 시와 사유를
                      음미해보세요.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab("mailbox")}
                    className="inline-flex items-center justify-center w-full px-4 py-3 bg-surface-container text-on-surface rounded font-ui-label-md text-ui-label-md hover:bg-surface-container-high transition-colors"
                  >
                    <span>시 편지함 가기</span>
                    <span className="material-symbols-outlined text-[16px] ml-1.5">
                      auto_stories
                    </span>
                  </button>
                </div>
              </div>
            </section>

            {/* 5. 21:00 개장 알림 받기 */}
            <section className="bg-surface-container rounded-xl p-6 sm:p-10 shadow-sm mb-space-xl relative overflow-hidden">
              <div className="max-w-2xl mx-auto text-center space-y-space-md relative z-10">
                <div className="w-12 h-12 mx-auto rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[24px]">
                    notifications_active
                  </span>
                </div>
                <div className="space-y-space-xs">
                  <h2 className="font-headline-md text-headline-md text-on-surface">
                    21:00 개장 알림 받기
                  </h2>
                  <p className="font-body-md text-body-md text-tertiary">
                    별빛이 켜지는 순간, 부담 없는 조용한 알림을 보내드립니다.
                  </p>
                </div>

                {!notifySuccess ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setNotifySuccess(true);
                    }}
                    className="flex flex-col sm:flex-row items-center gap-2 max-w-md mx-auto pt-2"
                  >
                    <input
                      type="email"
                      required
                      value={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.value)}
                      placeholder="답장을 수신할 이메일 주소"
                      className="w-full px-4 py-3 bg-surface-container-lowest text-on-surface placeholder:text-tertiary rounded text-body-sm font-body-sm outline-none focus:ring-2 focus:ring-secondary/40 shadow-inner"
                    />
                    <button
                      type="submit"
                      className="w-full sm:w-auto shrink-0 px-6 py-3 bg-primary text-on-primary rounded font-ui-label-md text-ui-label-md hover:bg-primary-container transition-colors shadow-sm"
                    >
                      자정의 소식 받기
                    </button>
                  </form>
                ) : (
                  <div className="bg-surface-container-lowest p-4 rounded-lg shadow-sm text-on-surface-variant font-body-sm text-body-sm max-w-md mx-auto">
                    <div className="flex items-center justify-center gap-2 text-primary font-medium mb-1">
                      <span className="material-symbols-outlined text-[20px]">
                        check_circle
                      </span>
                      <span>알림 등록이 완료되었습니다.</span>
                    </div>
                    <span>
                      오늘 밤 21시 정각, 별이 뜰 때 조용히 문을 두드리겠습니다.
                    </span>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
