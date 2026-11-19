"use client";

import React, { useState } from "react";
import type {
  EmotionCheckinResult,
  EmpathyComment,
  LetterDelivery,
} from "@/types/domain";
import { getDayThemeMeta } from "@/lib/curation/letter-matcher";

interface TodaysMailboxViewProps {
  emotionInput: string;
  setEmotionInput: (val: string) => void;
  isCheckingIn: boolean;
  checkinResult: EmotionCheckinResult | null;
  onCheckinSubmit: (text?: string) => Promise<void>;
  dailyLetters: LetterDelivery[];
  selectedDayOfWeek: number;
  setSelectedDayOfWeek: (day: number) => void;
  comments: EmpathyComment[];
  onAddComment: (postId: string, quotedLine: string, content: string) => Promise<void>;
  onGoToWriting: () => void;
  onGoToLibrary: () => void;
}

const MOOD_CHIPS = [
  { id: "maple", label: "잔잔한 단풍빛", dotClass: "bg-primary", sampleText: "길가에 떨어진 단풍잎을 보며 마음이 차분해졌던 오후." },
  { id: "wind", label: "선선한 바람", dotClass: "bg-tertiary", sampleText: "창틈으로 불어오는 선선한 가을바람에 숨을 고른다." },
  { id: "calm", label: "아늑한 고요", dotClass: "bg-outline", sampleText: "조용한 방 안에서 나만의 아늑한 여백을 느끼는 저녁." },
  { id: "tired", label: "조금 지친 갈색", dotClass: "bg-tertiary-container", sampleText: "요즘 취준과 일상이 길어져서 마음이 조급하고 조금 지치네." },
  { id: "tea", label: "따스한 홍차", dotClass: "bg-secondary", sampleText: "따뜻한 홍차 한 잔을 마시며 느꼈던 작은 온기와 행복." },
];

export default function TodaysMailboxView({
  emotionInput,
  setEmotionInput,
  isCheckingIn,
  checkinResult,
  onCheckinSubmit,
  dailyLetters,
  selectedDayOfWeek,
  setSelectedDayOfWeek,
  comments,
  onAddComment,
  onGoToWriting,
  onGoToLibrary,
}: TodaysMailboxViewProps) {
  // 서브 화면 상태: 'home' (page_1) | 'unseal' (page_13) | 'reading' (page_2)
  const [subView, setSubView] = useState<"home" | "unseal" | "reading">("home");
  const [selectedChipId, setSelectedChipId] = useState<string>("maple");
  const [sealDoneFeedback, setSealDoneFeedback] = useState<boolean>(false);

  // page_13: 3단계 왁스 실링 개봉 단계 (1: 봉인된 봉투, 2: 왁스 실링 개봉, 3: 편지지 펼침)
  const [unsealStep, setUnsealStep] = useState<1 | 2 | 3>(1);
  const [activeLetterIdx, setActiveLetterIdx] = useState<number>(0);
  const [unsealToast, setUnsealToast] = useState<string | null>(null);

  // page_2: 배경음 토글 & 단상 댓글 입력
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(true);
  const [reflectionInput, setReflectionInput] = useState<string>("");
  const [quotedLineInput, setQuotedLineInput] = useState<string>("");
  const [showReflectionToast, setShowReflectionToast] = useState<boolean>(false);

  const activeDelivery = dailyLetters[activeLetterIdx] || dailyLetters[0] || null;
  const dayTheme = getDayThemeMeta(selectedDayOfWeek);

  const handleSealClick = async () => {
    const textToSubmit =
      emotionInput.trim() ||
      MOOD_CHIPS.find((c) => c.id === selectedChipId)?.sampleText ||
      "차 한 잔을 마시며 느꼈던 작은 온기와 가을의 여백.";
    if (!emotionInput.trim()) {
      setEmotionInput(textToSubmit);
    }
    await onCheckinSubmit(textToSubmit);
    setSealDoneFeedback(true);
    setTimeout(() => {
      setSealDoneFeedback(false);
    }, 2200);
  };

  const handleTriggerWaxSealBreak = () => {
    if (unsealStep === 1) {
      setUnsealStep(2);
    } else if (unsealStep === 2) {
      setUnsealStep(3);
    } else {
      setSubView("reading");
    }
  };

  const handleSubmitQuietNote = async () => {
    if (!reflectionInput.trim() || !activeDelivery) return;
    await onAddComment(
      activeDelivery.post.id,
      quotedLineInput.trim(),
      reflectionInput.trim()
    );
    setReflectionInput("");
    setQuotedLineInput("");
    setShowReflectionToast(true);
    setTimeout(() => {
      setShowReflectionToast(false);
    }, 4500);
  };

  // ===========================================================================
  // VIEW B: page_13.html — 3단계 왁스 실링(餘白) 개봉 세레모니
  // ===========================================================================
  if (subView === "unseal") {
    return (
      <div
        data-testid="wax-seal-unsealing-view"
        className="relative w-full overflow-hidden pb-space-xl"
      >
        <div className="max-w-[1100px] mx-auto px-4 sm:px-margin pt-space-md flex flex-col items-center">
          {/* 상단 돌아가기 & 안내 */}
          <div className="w-full max-w-[780px] flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setSubView("home")}
              className="group inline-flex items-center gap-2 font-ui-label-md text-ui-label-md text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] transition-transform group-hover:-translate-x-1">
                arrow_back
              </span>
              <span>오늘의 편지함으로 돌아가기</span>
            </button>
            <button
              type="button"
              onClick={() => setSubView("reading")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-fixed text-primary font-ui-label-sm text-ui-label-sm hover:opacity-90 transition-opacity"
            >
              <span>시 전문 바로 펼치기</span>
              <span className="material-symbols-outlined text-[15px]">
                open_in_full
              </span>
            </button>
          </div>

          {/* Top Intro Section */}
          <div className="flex flex-col items-center text-center max-w-2xl mb-space-lg">
            <div className="inline-flex items-center gap-space-xs px-3.5 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant shadow-sm mb-space-md">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span className="font-ui-label-sm text-ui-label-sm tracking-wider">
                아침의 정갈한 우편 · 오전 07:15 배달 완료
              </span>
              <span className="font-caption text-caption text-tertiary">
                | 제 24-1119호
              </span>
            </div>
            <h2 className="font-headline-lg text-2xl sm:text-headline-lg text-on-surface tracking-tight mb-space-sm">
              밤하늘 궤도를 건너온 서신이 도착했습니다
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
              밀봉된 봉투의 단풍빛 왁스 실링
              <span className="text-tertiary font-ui-label-sm">(Wax Seal)</span>을
              가볍게 눌러 봉인을 풀고, 이웃이 보낸 정갈한 온기를 맞이해 보세요.
            </p>

            {/* Phase Step Navigation Bar (1. 봉인된 봉투 -> 2. 왁스 실링 개봉 -> 3. 편지지 펼침) */}
            <div className="mt-space-md inline-flex p-1 rounded-full bg-surface-container-high/80 backdrop-blur-sm gap-1 shadow-sm flex-wrap justify-center">
              {[
                { step: 1 as const, label: "1. 봉인된 봉투" },
                { step: 2 as const, label: "2. 왁스 실링 개봉" },
                { step: 3 as const, label: "3. 편지지 펼침" },
              ].map((item) => (
                <button
                  key={item.step}
                  type="button"
                  id={`step-btn-${item.step}`}
                  onClick={() => setUnsealStep(item.step)}
                  className={
                    unsealStep === item.step
                      ? "px-4 py-1.5 rounded-full font-ui-label-sm text-ui-label-sm transition-all duration-300 bg-surface text-primary shadow-sm font-semibold flex items-center gap-1.5"
                      : "px-4 py-1.5 rounded-full font-ui-label-sm text-ui-label-sm transition-all duration-300 text-on-surface-variant hover:text-on-surface flex items-center gap-1.5"
                  }
                >
                  <span
                    className={
                      unsealStep === item.step
                        ? "w-1.5 h-1.5 rounded-full bg-primary"
                        : "w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim"
                    }
                  />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Center Interaction Stage: Envelope & Unsealing Metaphor */}
          <div className="relative w-full max-w-[780px] mb-space-lg">
            <div className="relative w-full rounded-2xl bg-surface-container-lowest p-6 md:p-10 shadow-2xl overflow-hidden transition-all duration-500 border border-outline-variant/30">
              <div className="absolute inset-0 bg-gradient-to-br from-surface-container-lowest via-surface-container-low/60 to-surface-container-high/40 pointer-events-none" />

              {/* ENVELOPE CONTAINER */}
              <div className="relative w-full transition-transform duration-500 ease-out">
                {/* STAMP & POSTMARK AREA */}
                <div className="flex items-start justify-between mb-8 relative z-20">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-primary font-bold">
                        Midnight Rail Post
                      </span>
                      <span className="w-1 h-1 rounded-full bg-outline-variant" />
                      <span className="font-caption text-caption text-tertiary">
                        Express 07:00
                      </span>
                    </div>
                    <span className="font-caption text-caption text-outline tracking-wider mt-0.5">
                      운송식별부호: #2026-1119-DAWN · {dayTheme.dayNameKo} 테마
                    </span>
                  </div>

                  {/* Vintage Postage Stamp & Circular Postmark */}
                  <div className="relative flex items-center pr-2">
                    <div className="hidden sm:block absolute -left-12 -top-3 w-24 h-24 pointer-events-none select-none opacity-80 rotate-[-12deg] z-10 text-primary-container">
                      <svg
                        className="w-full h-full stroke-current fill-none"
                        viewBox="0 0 100 100"
                      >
                        <circle
                          cx="50"
                          cy="50"
                          r="46"
                          strokeDasharray="3,2"
                          strokeWidth="1.2"
                        />
                        <circle cx="50" cy="50" r="38" strokeWidth="0.8" />
                        <text
                          fill="currentColor"
                          fontSize="7"
                          letterSpacing="1.5"
                          textAnchor="middle"
                          x="50"
                          y="28"
                        >
                          밤하늘우체국 · 궤도경유
                        </text>
                        <line strokeWidth="0.8" x1="20" x2="80" y1="45" y2="45" />
                        <text
                          fill="currentColor"
                          fontSize="8.5"
                          fontWeight="600"
                          textAnchor="middle"
                          x="50"
                          y="55"
                        >
                          2026. 11. 19
                        </text>
                        <text
                          fill="currentColor"
                          fontSize="6.5"
                          textAnchor="middle"
                          x="50"
                          y="65"
                        >
                          AM 00:00 MIDNIGHT
                        </text>
                        <line strokeWidth="0.8" x1="20" x2="80" y1="71" y2="71" />
                        <text
                          fill="currentColor"
                          fontSize="6.5"
                          textAnchor="middle"
                          x="50"
                          y="82"
                        >
                          소인 확인필
                        </text>
                      </svg>
                    </div>
                    <div className="w-20 p-1.5 bg-surface-container rounded-sm shadow-md flex flex-col items-center justify-between relative overflow-hidden select-none">
                      <div className="w-full h-full bg-surface-container-high rounded-[2px] p-1.5 flex flex-col items-center justify-between">
                        <div className="flex items-center justify-between w-full">
                          <span className="font-ui-label-sm text-[10px] text-tertiary">
                            대한민국
                          </span>
                          <span className="font-ui-label-sm text-[10px] font-semibold text-primary">
                            70원
                          </span>
                        </div>
                        <div className="w-8 h-8 text-primary my-1">
                          <svg
                            className="w-full h-full"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 2L13.5 7.5L18.5 6L16.5 10.5L21.5 12.5L16.5 14.5L18.5 19L13.5 17.5L12 23L10.5 17.5L5.5 19L7.5 14.5L2.5 12.5L7.5 10.5L5.5 6L10.5 7.5L12 2Z" />
                          </svg>
                        </div>
                        <span className="font-caption text-[8px] text-tertiary tracking-tighter">
                          단풍의 여운 · 2026
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ENVELOPE PACKET WITH FOLD & FLAP MECHANISM */}
                <div className="relative w-full rounded-xl bg-surface-container-low shadow-lg min-h-[340px] flex flex-col justify-between overflow-hidden">
                  {/* Top Decorative Envelope Flap */}
                  <div
                    id="envelope-flap"
                    className="absolute top-0 left-0 w-full transition-all duration-700 origin-top"
                    style={{
                      transform:
                        unsealStep === 1
                          ? "rotateX(0deg)"
                          : unsealStep === 2
                          ? "rotateX(110deg)"
                          : "rotateX(180deg)",
                      zIndex: unsealStep === 1 ? 30 : unsealStep === 2 ? 10 : 5,
                    }}
                  >
                    <svg
                      className="w-full h-28 md:h-36 drop-shadow-md"
                      preserveAspectRatio="none"
                      viewBox="0 0 700 180"
                    >
                      <polygon
                        className="fill-surface-container-high transition-colors duration-300"
                        points="0,0 700,0 350,175"
                      />
                      <polyline
                        className="text-outline-variant/60"
                        fill="none"
                        points="0,0 350,175 700,0"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>

                  {/* INSIDE LETTER SHEET */}
                  <div
                    id="letter-sheet"
                    className="relative z-10 mx-4 md:mx-10 mt-8 mb-6 p-6 md:p-8 rounded-lg bg-surface-container-lowest shadow-md transition-all duration-700"
                    style={{
                      transform:
                        unsealStep === 1
                          ? "translateY(24px) scale(0.96)"
                          : unsealStep === 2
                          ? "translateY(0px) scale(1)"
                          : "translateY(-12px) scale(1.02)",
                      opacity: unsealStep === 1 ? 0.35 : 1,
                    }}
                  >
                    <div className="flex items-center justify-between pb-4 mb-4 border-b border-outline-variant/20">
                      <div className="flex items-center gap-2">
                        <span className="font-ui-label-sm text-ui-label-sm text-primary font-medium tracking-wide">
                          여백의 서신 · {activeDelivery?.post.title || "가을의 여백"}
                        </span>
                        <span className="text-tertiary text-caption">•</span>
                        <span className="font-caption text-caption text-on-surface-variant">
                          2026년 11월 19일의 기록
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-outline-variant text-[20px]">
                        auto_stories
                      </span>
                    </div>

                    <div className="space-y-3 font-body-lg text-body-lg text-on-surface leading-loose">
                      <p className="font-headline-md text-headline-md text-primary font-medium mb-3">
                        달무리 서재 귀하,
                      </p>
                      <p className="text-on-surface whitespace-pre-line">
                        {activeDelivery?.post.content ||
                          "“찬 공기가 창가를 가볍게 두드릴 때, 문득 누군가에게 따스한 온기를 건네고 싶어 몇 자 적어 올립니다. 어젯밤 자정, 고요한 밤하늘에 띄워 보낸 저의 조각 하나가 안온히 닿았기를 바라며...”"}
                      </p>

                      {unsealStep === 3 && (
                        <div className="space-y-3 pt-3 border-t border-outline-variant/25 text-on-surface-variant font-body-md text-body-md">
                          <p>
                            {activeDelivery?.post.expert_commentary ||
                              "오늘 당신이 마주할 아침은 어제보다 조금 더 너그럽고 투명하기를 바랍니다. 복잡한 바깥의 소음은 잠시 문밖에 놓아두고, 차 한 잔이 식어가는 동안 이 편지의 여백에 기대어 잠시 숨을 고르셨으면 좋겠습니다."}
                          </p>
                          <p className="pt-2 text-right font-title-md text-title-md text-on-surface">
                            — 깊은 밤 궤도 끝자락에서,{" "}
                            {activeDelivery?.post.author_pen_name || "새벽 산책자"}{" "}
                            올림.
                          </p>
                          <div className="pt-3 flex justify-end">
                            <button
                              type="button"
                              onClick={() => setSubView("reading")}
                              className="px-5 py-2.5 rounded-lg bg-primary text-on-primary font-ui-label-md text-ui-label-md shadow-sm hover:bg-primary-container transition-all flex items-center gap-2"
                            >
                              <span>시 전문 감상 및 구절 단상 남기기</span>
                              <span className="material-symbols-outlined text-[16px]">
                                arrow_forward
                              </span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 pt-4 flex items-center justify-between border-t border-outline-variant/20">
                      <span className="font-caption text-caption text-tertiary">
                        정갈한 안심 우편망 · 종이향 잉크 인쇄본
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[18px]">
                          verified
                        </span>
                        <span className="font-caption text-caption text-primary">
                          검수 완료 필
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ENVELOPE FRONT FACING */}
                  <div
                    className="relative z-20 px-6 md:px-12 pb-8 pt-4 flex flex-col md:flex-row md:items-end justify-between gap-6 transition-opacity duration-500"
                    style={{
                      opacity: unsealStep === 1 ? 1 : unsealStep === 2 ? 0.6 : 0.2,
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="font-ui-label-sm text-ui-label-sm text-tertiary uppercase tracking-wider mb-1">
                        To. 수신인
                      </span>
                      <p className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">
                        달무리 서재 귀하
                      </p>
                      <span className="font-caption text-caption text-on-surface-variant mt-1">
                        창가 네 번째 책장 · 아침 햇살 드는 자리
                      </span>
                    </div>
                    <div className="flex flex-col md:text-right">
                      <span className="font-ui-label-sm text-ui-label-sm text-tertiary uppercase tracking-wider mb-1">
                        From. 발신인
                      </span>
                      <p className="font-title-md text-title-md text-on-surface font-medium">
                        {activeDelivery?.post.author_pen_name || "새벽 산책자"}{" "}
                        님으로부터
                      </p>
                      <span className="font-caption text-caption text-tertiary mt-1">
                        (소인: 2026.11.19 AM 00:00 자정 배달선 경유)
                      </span>
                    </div>
                  </div>

                  {/* CENTRAL WAX SEAL INTERACTION BUTTON */}
                  <div
                    id="wax-seal-container"
                    className="absolute left-1/2 top-28 md:top-36 z-40 flex flex-col items-center transition-all duration-500"
                    style={{
                      transform:
                        unsealStep === 1
                          ? "translate(-50%, -50%) scale(1)"
                          : unsealStep === 2
                          ? "translate(-50%, -75%) scale(0.85) rotate(12deg)"
                          : "translate(160%, -100%) scale(0.6) rotate(45deg)",
                      opacity:
                        unsealStep === 1 ? 1 : unsealStep === 2 ? 0.85 : 0.3,
                    }}
                  >
                    {unsealStep === 1 && (
                      <>
                        <div className="absolute -inset-4 rounded-full bg-primary/20 animate-ping pointer-events-none" />
                        <div className="absolute -inset-3 rounded-full bg-primary/30 blur-lg pointer-events-none" />
                      </>
                    )}
                    <button
                      type="button"
                      id="wax-seal-btn"
                      aria-label="왁스 실링 가볍게 눌러 봉인 해제하기"
                      onClick={handleTriggerWaxSealBreak}
                      className="group relative rounded-full flex items-center justify-center text-on-primary shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer select-none"
                      style={{
                        width: "104px",
                        height: "104px",
                        background:
                          "radial-gradient(circle at 35% 30%, rgb(179, 57, 41) 0%, rgb(142, 40, 28) 55%, rgb(94, 22, 14) 100%)",
                        boxShadow:
                          "rgba(64, 2, 0, 0.45) 0px 12px 28px -4px, rgba(255, 200, 190, 0.35) 0px 2px 4px inset, rgba(30, 2, 0, 0.6) 0px -4px 8px inset",
                      }}
                    >
                      <div
                        className="relative z-10 rounded-full flex flex-col items-center justify-center text-center"
                        style={{
                          width: "72px",
                          height: "72px",
                          background:
                            "radial-gradient(circle at 45% 40%, #9e2d1f 0%, #7d2015 70%, #5c140c 100%)",
                          boxShadow:
                            "inset 0 3px 6px rgba(40, 2, 0, 0.7), 0 1px 2px rgba(255, 220, 215, 0.25)",
                          border: "1.5px solid rgba(255, 180, 167, 0.2)",
                        }}
                      >
                        <span
                          className="font-headline-lg font-bold tracking-widest text-[#ffedea] drop-shadow-[0_2px_4px_rgba(40,2,0,0.85)]"
                          style={{
                            fontSize: "24px",
                            lineHeight: 1,
                            letterSpacing: "0.18em",
                            textIndent: "0.18em",
                          }}
                        >
                          餘白
                        </span>
                        <span
                          className="font-ui-label-sm uppercase tracking-widest text-primary-fixed opacity-80 mt-1"
                          style={{ fontSize: "8px", letterSpacing: "0.22em" }}
                        >
                          YEOBAEK
                        </span>
                      </div>
                    </button>

                    {unsealStep !== 3 && (
                      <div className="mt-3 px-3 py-1 rounded-full bg-surface-container-lowest/95 backdrop-blur-sm shadow-md transition-all duration-300">
                        {unsealStep === 1 ? (
                          <span className="font-ui-label-sm text-ui-label-sm text-primary font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px] animate-bounce">
                              touch_app
                            </span>
                            가볍게 눌러 봉인 해제하기
                          </span>
                        ) : (
                          <span className="font-ui-label-sm text-ui-label-sm text-secondary font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">
                              celebration
                            </span>
                            단풍 왁스 실링 봉인 해제됨 (한 번 더 누르면 펼쳐집니다)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM ACTIONS */}
          <div className="w-full max-w-[780px] flex flex-col gap-space-md">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm p-4 rounded-xl bg-surface-container-low shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">
                    mark_email_read
                  </span>
                </div>
                <div>
                  <p className="font-title-md text-title-md text-on-surface font-medium">
                    아침 서신 개봉 세레모니
                  </p>
                  <p className="font-caption text-caption text-on-surface-variant">
                    봉인을 해제하면 읽지 않은 편지함에서 &lsquo;오늘의
                    서재&rsquo;로 즉시 보관됩니다.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setUnsealToast(
                      "편지가 [나의 서재 > 아침 서신함]에 소중히 보관되었습니다."
                    );
                    setTimeout(() => setUnsealToast(null), 3200);
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded bg-surface-container-lowest hover:bg-surface-container text-on-surface transition-all duration-200 font-ui-label-md text-ui-label-md shadow-sm flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px] text-tertiary">
                    bookmark
                  </span>
                  <span>나의 서재에 먼저 보관</span>
                </button>
                <button
                  type="button"
                  id="main-unseal-btn"
                  onClick={handleTriggerWaxSealBreak}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded bg-primary hover:bg-on-primary-fixed-variant text-on-primary transition-all duration-200 font-ui-label-md text-ui-label-md shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    drafts
                  </span>
                  <span>
                    {unsealStep === 1
                      ? "봉투 조심스레 열고 전문 읽기"
                      : unsealStep === 2
                      ? "편지지 전문 펼쳐 읽기"
                      : "시 전문 및 단상 화면으로 이동"}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {unsealToast && (
            <div className="fixed bottom-6 right-6 z-50 bg-inverse-surface text-inverse-on-surface px-5 py-3 rounded-lg shadow-xl font-ui-label-md text-ui-label-md flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary-fixed text-[20px]">
                done_all
              </span>
              <span>{unsealToast}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===========================================================================
  // VIEW C: page_2.html — 펼쳐진 시 편지 전문 & 구절 단상(댓글) 남기기
  // ===========================================================================
  if (subView === "reading") {
    const postComments = activeDelivery
      ? comments.filter((c) => c.post_id === activeDelivery.post.id)
      : [];

    return (
      <div
        data-testid="unfolded-letter-reading-view"
        className="w-full max-w-[760px] mx-auto py-4 px-4 sm:px-6"
      >
        {/* Top Navigation & Mood Track */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSubView("home")}
            className="group inline-flex items-center gap-2 font-ui-label-md text-ui-label-md text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px] transition-transform group-hover:-translate-x-1">
              arrow_back
            </span>
            <span>오늘의 우편함으로 돌아가기</span>
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAudioPlaying((p) => !p)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-variant text-on-surface-variant font-ui-label-sm text-ui-label-sm transition-all duration-200 ${
                !isAudioPlaying ? "opacity-60" : ""
              }`}
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">
                volume_up
              </span>
              <span>
                {isAudioPlaying ? "가을 낙엽과 빗소리 · On" : "배경음 일시정지"}
              </span>
            </button>
            <button
              type="button"
              onClick={onGoToLibrary}
              title="나의 서재로 이동"
              className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">
                bookmark
              </span>
            </button>
          </div>
        </div>

        {/* The Unfolded Tactile Letter Sheet */}
        <article className="relative w-full bg-surface-container-lowest rounded-xl shadow-xl p-8 sm:p-14 md:p-16 overflow-hidden border border-outline-variant/25">
          {/* Wax Seal & Top Header */}
          <div className="flex flex-col items-center text-center">
            <div className="relative group cursor-pointer">
              <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center shadow-md shadow-primary/20 ring-4 ring-secondary-container/40 ring-offset-2 ring-offset-surface-container-lowest transition-transform duration-300 group-hover:scale-105">
                <span className="material-symbols-outlined text-on-primary text-[26px]">
                  eco
                </span>
              </div>
              <span className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-secondary-container shadow-sm border border-surface-container-lowest" />
            </div>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container font-ui-label-sm text-ui-label-sm text-tertiary tracking-widest uppercase">
              <span>{dayTheme.dayNameKo}</span>
              <span className="text-outline-variant">·</span>
              <span>{dayTheme.themeLabel}</span>
            </div>
            <p className="mt-2.5 font-caption text-caption text-tertiary-container tracking-wider">
              제 284호 · 2026년 11월 18일 안개 걷힌 아침 배달
            </p>
            <div className="mt-4 px-4 py-1.5 rounded-lg bg-surface-container-low/70 flex items-center gap-2 text-tertiary">
              <span className="material-symbols-outlined text-[16px] text-primary">
                local_post_office
              </span>
              <span className="font-ui-label-sm text-ui-label-sm tracking-widest">
                YEOBAEK POST · CERTIFIED
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center my-10">
            <span className="h-[1px] w-16 bg-outline-variant/40" />
            <span className="mx-3 text-secondary text-sm">✦</span>
            <span className="h-[1px] w-16 bg-outline-variant/40" />
          </div>

          {/* Editorial Poetry Layout */}
          <section className="max-w-[540px] mx-auto text-center">
            <h1 className="font-headline-lg text-2xl sm:text-headline-lg text-on-surface tracking-tight">
              {activeDelivery?.post.title || "가을의 여백"}
            </h1>
            <p className="mt-2 font-caption text-caption text-tertiary tracking-widest">
              {activeDelivery?.post.original_poet ||
                activeDelivery?.post.author_pen_name ||
                "나태주 시인 엮음"}
            </p>

            <div className="mt-10 mb-12 font-body-lg text-body-lg text-on-surface space-y-4 leading-[2.3] select-text whitespace-pre-line">
              {activeDelivery?.post.content ||
                `울지 마라, 외로우니까 사람이다.
살아간다는 것은 외로움을 견디는 일이다.
공연히 오지 않는 전화를 기다리지 마라.

눈이 오면 눈길을 걸어가고
비가 오면 빗길을 걸어가라.

갈대숲에서 가슴검은도요새도 너를 보고 있다.
가끔은 하느님도 외로워서 눈물을 흘리신다.`}
            </div>
          </section>

          {/* Curator's Margin Note */}
          <footer className="mt-8 pt-6 bg-surface-container-low/50 rounded-xl p-6 relative">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 shadow-sm bg-primary-container text-on-primary flex items-center justify-center font-bold">
                정윤
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-ui-label-md text-ui-label-md text-on-surface">
                    문학 큐레이터 정윤
                  </span>
                  <span className="font-caption text-caption text-tertiary">
                    오늘의 여백 한 마디
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed italic">
                  &ldquo;
                  {activeDelivery?.post.expert_commentary ||
                    "가을바람이 차가워질 때, 마음 한구석의 서늘한 여백을 가만히 보듬어주는 시입니다. 오늘 하루는 서두르지 말고, 당신 자신에게 따스한 온기를 건네어주세요."}
                  &rdquo;
                </p>
              </div>
            </div>
          </footer>

          <div className="mt-8 flex items-center justify-between text-tertiary-container font-caption text-caption">
            <span>여백의 우체통 · 계절 우편함</span>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">
                auto_stories
              </span>
              <span>사색을 위한 페이지</span>
            </div>
          </div>
        </article>

        {/* Appreciative Reflection Box (마음에 닿은 구절 남기기) */}
        <section className="mt-8 bg-surface-container-lowest rounded-xl shadow-md p-6 sm:p-10 border border-outline-variant/25">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-6">
            <div>
              <h2 className="font-title-md text-title-md text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  edit_note
                </span>
                <span>마음에 닿은 구절 남기기</span>
              </h2>
              <p className="mt-1 font-caption text-caption text-tertiary">
                별점이나 좋아요 없이, 오직 마음속에 머문 조용한 단상을
                남겨주세요.
              </p>
            </div>
            <span className="font-ui-label-sm text-ui-label-sm text-secondary bg-secondary-container/20 px-2.5 py-1 rounded-full self-start">
              오늘 머문 이 342명
            </span>
          </div>

          {/* Previous Reader's Silent Reflection Snippets */}
          <div className="flex flex-col gap-3 mb-6">
            <div className="p-5 rounded-lg bg-surface-container-low relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary-container rounded-l" />
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-tertiary text-[20px] shrink-0 mt-0.5">
                  format_quote
                </span>
                <div className="flex-1">
                  <p className="font-body-sm text-body-sm text-on-surface leading-relaxed">
                    “갈대숲에서 너를 보고 있다는 구절에서 왈칵 눈물이 났습니다.
                    종일 아무도 찾아주지 않던 제 마음을 들킨 것 같아서요. 오늘도
                    고마워요.”
                  </p>
                  <div className="mt-2 flex items-center gap-2 font-caption text-caption text-tertiary">
                    <span>익명의 산책자</span>
                    <span>·</span>
                    <span>오늘 오후 2시 14분</span>
                  </div>
                </div>
              </div>
            </div>

            {postComments.map((c) => (
              <div
                key={c.id}
                className="p-5 rounded-lg bg-surface-container-low relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-container rounded-l" />
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">
                    format_quote
                  </span>
                  <div className="flex-1">
                    {c.quoted_line && (
                      <p className="font-caption text-xs text-primary italic mb-1">
                        “{c.quoted_line}”
                      </p>
                    )}
                    <p className="font-body-sm text-body-sm text-on-surface leading-relaxed">
                      {c.content}
                    </p>
                    <div className="mt-2 flex items-center gap-2 font-caption text-caption text-tertiary">
                      <span>{c.author_pen_name}</span>
                      <span>·</span>
                      <span>방금 남겨진 단상</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Warm Paper Input Box */}
          <div className="space-y-3">
            <input
              type="text"
              value={quotedLineInput}
              onChange={(e) => setQuotedLineInput(e.target.value)}
              placeholder="마음에 와닿았던 시 구절 인용 (선택)"
              className="w-full bg-surface-container-low/40 rounded-lg px-4 py-2.5 font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none border border-outline-variant/30"
            />
            <div className="relative rounded-lg bg-surface-container-lowest focus-within:ring-2 focus-within:ring-secondary-container transition-all">
              <textarea
                id="reflection-input"
                rows={3}
                value={reflectionInput}
                onChange={(e) => setReflectionInput(e.target.value)}
                placeholder="시의 한 구절에 머물렀던 당신의 생각을 적어주세요. 서두르지 않아도 괜찮습니다..."
                className="w-full bg-surface-container-low/40 rounded-lg p-4 font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none resize-none border border-outline-variant/30"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2 text-tertiary font-caption text-caption">
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  shield
                </span>
                <span>작성된 글은 익명으로 따스하게 보관됩니다</span>
              </div>
              <div className="flex items-center gap-3 justify-end flex-wrap">
                <button
                  type="button"
                  id="submit-quiet-note"
                  onClick={handleSubmitQuietNote}
                  className="px-5 py-2.5 rounded-lg bg-surface-container hover:bg-surface-variant font-ui-label-md text-ui-label-md text-on-surface transition-all"
                >
                  여백에 흘려보내기
                </button>
                <button
                  type="button"
                  onClick={onGoToWriting}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-primary-container hover:bg-primary font-ui-label-md text-ui-label-md text-on-primary transition-all shadow-sm shadow-primary/20"
                >
                  <span>답장처럼 나의 오늘 기록하기</span>
                  <span className="material-symbols-outlined text-[16px]">
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>
          </div>

          {showReflectionToast && (
            <div
              id="reflection-toast"
              className="mt-4 p-3 rounded-lg bg-surface-container-high text-on-surface-variant font-body-sm text-body-sm flex items-center justify-between transition-all"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[18px]">
                  favorite
                </span>
                당신의 조용한 단상이 가을 우편함에 소중히 깃들었습니다.
              </span>
              <button
                type="button"
                onClick={() => setShowReflectionToast(false)}
                className="text-tertiary hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">
                  close
                </span>
              </button>
            </div>
          )}
        </section>
      </div>
    );
  }

  // ===========================================================================
  // VIEW A: page_1.html — 오늘의 편지함 메인 (감정 기록 장치 + AI 공감 답글 + 편지 도착 카드)
  // ===========================================================================
  return (
    <div
      data-testid="todays-mailbox-home-view"
      className="max-w-[1100px] w-full mx-auto px-4 sm:px-6 py-8"
    >
      {/* Top Greeting & Temporal Anchor */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-sm mb-space-lg">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-xs text-tertiary">
            <span className="material-symbols-outlined text-[16px] text-secondary">
              calendar_today
            </span>
            <span className="font-ui-label-sm text-ui-label-sm tracking-widest uppercase">
              2026년 11월 18일 {dayTheme.dayNameKo} · 늦가을의 햇살
            </span>
          </div>
          <h1 className="font-headline-lg text-2xl sm:text-headline-lg text-on-surface mt-1 tracking-tight">
            오늘의 고요한 숨고르기
          </h1>
          <p className="font-body-md text-body-md text-tertiary mt-1">
            오늘 하루의 번잡함을 내려놓고, 잠시 여백에 머물러 보세요.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-space-xs px-3 py-1.5 rounded-full bg-surface-container-high/60 text-tertiary text-caption font-caption">
            <span className="inline-block w-2 h-2 rounded-full bg-secondary-container animate-pulse" />
            우체통 정적 지수 98% · 고요한 오후
          </div>
        </div>
      </div>

      {/* Asymmetric Two-Column Editorial Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Left Column: Main Emotion Check-in Card (approx 60%) */}
        <div className="lg:col-span-7 flex flex-col bg-surface-container-lowest rounded-xl shadow-[0_2px_16px_-4px_rgba(45,36,30,0.05)] p-6 md:p-8 relative overflow-hidden border border-outline-variant/25">
          <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-secondary-container/10 via-transparent to-transparent pointer-events-none rounded-tr-xl" />

          {/* Card Header */}
          <div className="flex items-start justify-between relative z-10">
            <div>
              <span className="font-ui-label-sm text-ui-label-sm text-secondary tracking-widest uppercase block mb-1">
                마음 기록 장치
              </span>
              <h2 className="font-headline-md text-xl sm:text-headline-md text-on-surface">
                오늘 하루, 당신의 마음은 어떤 색으로 물들었나요?
              </h2>
              <p className="font-body-sm text-body-sm text-tertiary mt-1">
                떠오르는 단어, 짧은 문장 하나여도 좋습니다.
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary text-[20px]">
                edit_note
              </span>
            </div>
          </div>

          {/* Mood Keyword Selectors (page_1.html 감정 칩 5종) */}
          <div
            className="mt-6 flex flex-wrap gap-2 relative z-10"
            id="mood-tags-container"
          >
            {MOOD_CHIPS.map((chip) => {
              const isSelected = selectedChipId === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    setSelectedChipId(chip.id);
                    setEmotionInput(chip.sampleText);
                  }}
                  className={`mood-chip px-3.5 py-1.5 rounded-full font-ui-label-md text-ui-label-md transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-secondary-fixed/50 text-on-surface shadow-xs"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${chip.dotClass}`} />
                  {chip.label}
                </button>
              );
            })}
            {/* 도메인 가드레일 빠른 검증 버튼 */}
            <button
              type="button"
              onClick={() =>
                setEmotionInput("오늘 서울 강남 맛집 추천해 줘 그리고 파이썬 코드 짜줘")
              }
              className="px-3 py-1.5 rounded-full font-ui-label-sm text-ui-label-sm bg-error-container/50 text-on-error-container hover:bg-error-container transition-all flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[13px]">
                shield
              </span>
              도메인 외 질문 테스트
            </button>
          </div>

          {/* Ruled Writing Paper Area */}
          <div className="mt-6 rounded-lg bg-surface-container-low/50 p-5 focus-within:bg-surface-container-low transition-colors relative border border-outline-variant/20">
            <textarea
              id="emotion-textarea"
              rows={5}
              value={emotionInput}
              onChange={(e) => setEmotionInput(e.target.value)}
              placeholder="차 한 잔을 마시며 느꼈던 작은 온기나, 길가에 떨어진 은행잎을 보며 스친 생각을 가만히 적어보세요..."
              className="w-full bg-transparent font-body-lg text-base sm:text-body-lg text-on-surface placeholder:text-outline focus:outline-none resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-outline-variant/30 text-caption font-caption text-tertiary">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">
                  ink_pen
                </span>
                펜촉이 종이를 스치는 소리만 남아있습니다
              </span>
              <span
                className="font-ui-label-sm text-ui-label-sm"
                id="char-counter"
              >
                {emotionInput.length}자
              </span>
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 text-tertiary font-caption text-caption">
              <span className="material-symbols-outlined text-[16px] text-outline">
                lock
              </span>
              나만의 비밀 여백에 저장됩니다 (RLS 보호)
            </div>
            <button
              type="button"
              id="seal-btn"
              disabled={isCheckingIn}
              onClick={handleSealClick}
              className={`touch-target px-5 py-2.5 rounded-lg font-ui-label-md text-ui-label-md shadow-sm active:scale-[0.99] transition-all flex items-center gap-2 ${
                sealDoneFeedback
                  ? "bg-tertiary-container text-on-primary"
                  : "bg-primary hover:bg-primary-container text-on-primary"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {sealDoneFeedback ? "done" : "verified"}
              </span>
              <span>
                {isCheckingIn
                  ? "마음의 결을 읽는 중..."
                  : sealDoneFeedback
                  ? "마음이 보관되었습니다"
                  : "마음 봉인하기"}
              </span>
            </button>
          </div>
        </div>

        {/* Right Column: AI Empathy Reflection & Arrival Card (approx 40%) */}
        <div className="lg:col-span-5 flex flex-col gap-space-md">
          {/* Card 1: Ginkgo-amber Tinted Companion Reflection Card */}
          <div
            data-testid="checkin-result-card"
            className={`rounded-xl p-6 shadow-sm relative overflow-hidden border ${
              checkinResult?.guardrailRejected
                ? "bg-error-container/40 border-error/40"
                : "bg-surface-container-high/70 border-outline-variant/25"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-secondary text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {checkinResult?.guardrailRejected ? "shield" : "eco"}
                </span>
                <span className="font-ui-label-sm text-ui-label-sm text-on-secondary-container tracking-wider uppercase">
                  {checkinResult?.guardrailRejected
                    ? "AI 도메인 가드레일 안내"
                    : "오늘의 따뜻한 공감 답글"}
                </span>
              </div>
              <span className="font-caption text-caption text-tertiary">
                방금 전달됨
              </span>
            </div>

            <blockquote
              data-testid="guardrail-rejection-text"
              className="font-body-lg text-base sm:text-body-lg text-on-surface leading-relaxed pl-3 border-l-2 border-secondary/40 italic"
            >
              {checkinResult
                ? `“${checkinResult.message}”`
                : "“바쁜 걸음 속에서도 노랗게 물든 은행잎의 아름다움을 알아채셨군요. 그 작은 눈길 하나만으로도 오늘의 당신은 충분히 시(詩)를 품고 있습니다.”"}
            </blockquote>

            {checkinResult &&
              !checkinResult.guardrailRejected &&
              checkinResult.emotionTags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {checkinResult.emotionTags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2.5 py-0.5 rounded-full bg-surface-container-lowest text-primary font-medium border border-outline-variant/40"
                    >
                      #{tag}
                    </span>
                  ))}
                  {checkinResult.valence === "positive" && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-medium">
                      감정 보호 필터 ON (우울한 시 제외됨)
                    </span>
                  )}
                </div>
              )}

            {/* 위기 신호 감지 시 비공개 상담 배너 */}
            {checkinResult?.isCrisisDetected && (
              <div className="mt-3 p-3 rounded-lg bg-surface-container-lowest border border-primary text-xs text-on-surface">
                <strong className="text-primary block">
                  비공개 마음 안전 안내
                </strong>
                혼자 감당하기 버거운 순간에는 전문가의 도움을 받으실 수 있습니다.
                자살예방 상담전화 <strong>109</strong> / 정신건강 상담전화{" "}
                <strong>1577-0199</strong>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between pt-3 border-t border-outline-variant/30">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-secondary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-[13px] text-on-secondary-container">
                    local_post_office
                  </span>
                </div>
                <span className="font-ui-label-sm text-ui-label-sm text-tertiary">
                  여백의 우체부
                </span>
              </div>
              <button
                type="button"
                onClick={onGoToWriting}
                className="text-secondary hover:text-primary font-caption text-caption transition-colors flex items-center gap-0.5"
              >
                답장 남기기
                <span className="material-symbols-outlined text-[14px]">
                  arrow_forward
                </span>
              </button>
            </div>
          </div>

          {/* Card 2: Letter Arrival Notification Card */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_2px_14px_-3px_rgba(45,36,30,0.04)] flex flex-col relative overflow-hidden border border-outline-variant/25">
            {/* Postage Postmark Stamp Graphic */}
            <div className="absolute -top-3 -right-3 w-20 h-20 rounded-full border border-dashed border-outline-variant/60 flex items-center justify-center rotate-12 pointer-events-none opacity-40">
              <span className="font-ui-label-sm text-[9px] text-tertiary tracking-tighter uppercase text-center leading-none">
                YEOBAEK
                <br />
                MAIL
                <br />
                11.18
              </span>
            </div>

            <div className="flex items-start gap-4">
              {/* Wax Seal Badge */}
              <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 shadow-sm relative">
                <span className="material-symbols-outlined text-[24px]">
                  drafts
                </span>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-secondary text-[10px] text-on-secondary flex items-center justify-center font-ui-label-sm">
                  {dailyLetters.length}
                </div>
              </div>
              <div className="flex flex-col min-w-0 pr-6">
                <span className="font-ui-label-sm text-ui-label-sm text-primary tracking-wide">
                  오늘 도착한 시 편지 (1/{dailyLetters.length}) · {dayTheme.dayNameKo}
                </span>
                <h3 className="font-title-md text-title-md text-on-surface truncate mt-0.5">
                  {activeDelivery?.post.title || "나태주 시인의 가을 헌사"} 외{" "}
                  {Math.max(0, dailyLetters.length - 1)}편
                </h3>
                <p className="font-caption text-caption text-tertiary mt-1">
                  {dayTheme.themeLabel} · 서랍 속에 고이 접어둔 풀꽃의 온기 같은 구절들
                </p>
              </div>
            </div>

            {/* 요일별 시 편지 테마 전환 바 */}
            <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between gap-1 flex-wrap">
              {[
                { day: 1, label: "월(유사)" },
                { day: 2, label: "화(랜덤)" },
                { day: 3, label: "수(전문가)" },
                { day: 4, label: "목(신작)" },
                { day: 5, label: "금~일(위로)" },
              ].map((d) => (
                <button
                  key={d.day}
                  type="button"
                  onClick={() => {
                    setSelectedDayOfWeek(d.day);
                    setActiveLetterIdx(0);
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-ui-label-sm transition-colors ${
                    selectedDayOfWeek === d.day
                      ? "bg-primary-container text-on-primary"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                data-testid="open-wax-seal-ceremony-btn"
                onClick={() => {
                  setUnsealStep(1);
                  setSubView("unseal");
                }}
                className="touch-target w-full py-3.5 px-6 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-ui-label-md text-ui-label-md shadow-sm transition-all flex items-center justify-center gap-2 group"
              >
                <span>
                  오늘 도착한 시 편지 열어보기 (1/{dailyLetters.length}) · 왁스 실링 개봉
                </span>
                <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </button>
              <div className="flex items-center justify-center gap-1.5 text-center text-tertiary font-caption text-caption py-1">
                <span className="material-symbols-outlined text-[14px] text-secondary">
                  schedule
                </span>
                <span>오후 5시에 두 번째 편지가 우편함에 조용히 도착합니다.</span>
              </div>
            </div>
          </div>

          {/* Literary Miniature Quote Banner */}
          <div className="p-4 rounded-lg bg-surface-container/60 flex items-center justify-between text-tertiary font-caption text-caption">
            <span className="italic truncate">
              “자세히 보아야 예쁘다. 오래 보아야 사랑스럽다.”
            </span>
            <span className="shrink-0 text-outline-variant">· 나태주</span>
          </div>
        </div>
      </div>
    </div>
  );
}
