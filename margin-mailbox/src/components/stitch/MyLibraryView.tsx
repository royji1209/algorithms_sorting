"use client";

import React, { useMemo, useState } from "react";
import type { PoemPost } from "@/types/domain";

interface MyLibraryViewProps {
  posts: PoemPost[];
  onDispatchPrivatePost: (postId: string) => void;
  onSendWarmthNoteToNightSky: (noteText: string) => void;
  onGoToTodaysMailbox: () => void;
}

const WARM_CHIPS = [
  { emoji: "🍂", label: "마음에 닿아 기쁩니다", text: "마음에 닿아 기쁩니다." },
  {
    emoji: "☕",
    label: "따뜻한 밤 보내세요",
    text: "따뜻하고 평온한 밤 보내세요.",
  },
  {
    emoji: "🕯️",
    label: "당신의 계절도 평온하길",
    text: "머무시는 계절도 내내 다정하길 바랍니다.",
  },
  {
    emoji: "✉️",
    label: "글을 읽어주셔서 고맙습니다",
    text: "건네어주신 온기 덕분에 오늘의 여백이 가득 찼습니다.",
  },
];

// 2026년 11월 달력 기록 표시 날짜
const CALENDAR_DAYS_NOV_2026 = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const hasPrivateDot = [1, 5, 9, 11, 18, 24].includes(day);
  const hasSentDot = [3, 7, 13, 15, 17].includes(day);
  return { day, hasPrivateDot, hasSentDot };
});

export default function MyLibraryView({
  posts,
  onDispatchPrivatePost,
  onSendWarmthNoteToNightSky,
  onGoToTodaysMailbox,
}: MyLibraryViewProps) {
  const [filter, setFilter] = useState<"all" | "private" | "sent">("all");
  const [selectedDay, setSelectedDay] = useState<number>(18);

  // 모달 및 서브 화면 상태:
  // null | 'private-detail' (page_5) | 'reply-detail' (page_6) | 'send-warmth' (page_7) | 'receipt' (page_8)
  const [modalMode, setModalMode] = useState<
    null | "private-detail" | "reply-detail" | "send-warmth" | "receipt"
  >(null);
  const [selectedPost, setSelectedPost] = useState<PoemPost | null>(null);
  const [isBookmarkedReply, setIsBookmarkedReply] = useState<boolean>(false);
  const [modalActionFeedback, setModalActionFeedback] = useState<string | null>(
    null
  );

  // page_7: 한 줄 안부(온기 답장) 상태
  const [selectedWarmChipIdx, setSelectedWarmChipIdx] = useState<number>(0);
  const [warmthMessage, setWarmthMessage] = useState<string>(
    "마음에 닿아 기쁩니다."
  );

  // Stitch page_4 기본 타임라인 엔트리 + 사용자가 새로 작성한 글 병합
  const libraryEntries = useMemo(() => {
    const stitchDefaultEntries: PoemPost[] = [
      {
        id: "stitch-entry-nov18",
        author_id: "user-me",
        author_pen_name: "달무리 서재",
        title: "가을의 여백을 밟으며",
        content: `길가에 구르는 낙엽 소리가
오늘따라 유난히 바스락거린다.
발끝에 닿는 계절의 무게만큼
내 마음에 남은 생각들도 하나씩 비워내고 싶다.

가끔은 목적지 없이 걷는 이 무심한 발걸음 속에
가장 다정한 위로가 숨어있는지도 모른다.`,
        category: "poem",
        emotion_tags: ["단편시", "늦가을"],
        mood_valence: "calm",
        is_public: false,
        is_expert_curated: false,
        created_at: "2026-11-18T09:42:00.000Z",
      },
      {
        id: "stitch-entry-nov15",
        author_id: "user-me",
        author_pen_name: "달무리 서재",
        title: "초겨울을 맞이하는 차 한 잔",
        content: `찻잔에서 피어오르는 김을 바라보다가, 따스한 손끝의 감촉에 기대어 잠시 눈을 감았다.

식어가는 온도를 음미하며 건네는 안부에는 어떤 과장도 섞이지 않았다.

당신의 저녁도 부디 평안한 침묵과 온기로 가득 채워지기를 바라며, 길고 서늘한 계절의 문턱에서 이 작은 온기를 띄웁니다.`,
        category: "diary",
        emotion_tags: ["일상단상", "온기", "늦가을"],
        mood_valence: "warm",
        is_public: true,
        is_expert_curated: false,
        created_at: "2026-11-15T16:15:00.000Z",
      },
      {
        id: "stitch-entry-nov11",
        author_id: "user-me",
        author_pen_name: "달무리 서재",
        title: "기다림에 대하여",
        content: `누군가를 기다리는 시간은 결코 버려진 시간이 아니다. 마음에 빈 자리를 마련하는 시간이다. 가을 잎새가 떨어진 빈 가지에 겨울바람이 머물듯, 비워냄이 곧 머무름의 시작이 된다.`,
        category: "poem",
        emotion_tags: ["단편시"],
        mood_valence: "calm",
        is_public: false,
        is_expert_curated: false,
        created_at: "2026-11-11T23:20:00.000Z",
      },
    ];

    const userCustomPosts = posts.filter(
      (p) =>
        p.author_id === "user-me" &&
        !stitchDefaultEntries.some((d) => d.id === p.id)
    );

    const merged = [...userCustomPosts, ...stitchDefaultEntries];
    if (filter === "private") return merged.filter((p) => !p.is_public);
    if (filter === "sent") return merged.filter((p) => p.is_public);
    return merged;
  }, [posts, filter]);

  const handleOpenEntry = (entry: PoemPost) => {
    setSelectedPost(entry);
    if (entry.is_public) {
      setModalMode("reply-detail");
    } else {
      setModalMode("private-detail");
    }
  };

  const handleSendWarmthSubmit = () => {
    if (!warmthMessage.trim()) return;
    onSendWarmthNoteToNightSky(warmthMessage.trim());
    setModalMode("receipt");
  };

  // ===========================================================================
  // VIEW: page_8.html — 밤하늘 발송 영수증 화면 ("온기가 밤하늘로 조용히 띄워졌습니다")
  // ===========================================================================
  if (modalMode === "receipt") {
    return (
      <div
        data-testid="night-postal-receipt-view"
        className="flex flex-col w-full relative"
      >
        <div className="relative z-10 max-w-[1100px] w-full mx-auto px-4 sm:px-6 py-12 flex flex-col items-center">
          {/* Subtle Floating Toast */}
          <div
            id="warmth-toast"
            className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-surface-container-lowest/95 shadow-md shadow-on-surface/5 backdrop-blur-md mb-8 border border-outline-variant/30"
          >
            <span className="text-secondary select-none text-base">🍂</span>
            <span className="font-ui-label-md text-ui-label-md text-on-surface-variant">
              따스한 온기 쪽지가 전송 대기열에 고이 담겼습니다.
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse" />
          </div>

          {/* Centerpiece Stationery Card */}
          <div className="w-full max-w-[560px] bg-surface-container-lowest rounded-xl shadow-xl shadow-on-surface/5 relative p-8 sm:p-10 md:p-12 overflow-hidden transition-all border border-outline-variant/25">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary-container/30 to-transparent" />

            {/* Wax Seal & Vintage Postmark Section */}
            <div className="flex items-center justify-between mb-8">
              <div className="relative flex items-center justify-center group select-none">
                <div className="absolute -inset-1.5 rounded-full bg-[#7a2217]/25 blur-[3px] pointer-events-none -z-10" />
                <div
                  className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center cursor-default shadow-[0_4px_12px_rgba(70,18,12,0.38),inset_0_2px_3px_rgba(255,200,180,0.35),inset_0_-3px_5px_rgba(40,8,4,0.5)]"
                  style={{
                    background:
                      "radial-gradient(circle at 34% 30%, #b84a39 0%, #993325 45%, #7e2417 80%, #681a0e 100%)",
                  }}
                >
                  <div
                    className="w-[52px] h-[52px] rounded-full flex flex-col items-center justify-center relative border border-[#ffb4a7]/25"
                    style={{
                      background:
                        "radial-gradient(circle at 40% 36%, #8f2c1e 0%, #782115 70%, #64190d 100%)",
                    }}
                  >
                    <div className="relative flex flex-col items-center justify-center text-center">
                      <span className="material-symbols-outlined text-[15px] leading-none text-[#ffdad4]/90">
                        spa
                      </span>
                      <span className="font-serif text-[13px] font-bold leading-tight text-[#ffdad4] mt-0.5">
                        餘
                      </span>
                      <span className="font-ui-label-sm text-[7px] font-semibold tracking-[0.18em] text-[#ffdad4]/75 uppercase scale-90 -mt-0.5">
                        우체印
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end text-right">
                <div className="px-2.5 py-1 rounded bg-surface-container-low text-tertiary-container flex items-center gap-1.5 mb-1.5">
                  <span className="material-symbols-outlined text-[14px]">
                    done_all
                  </span>
                  <span className="font-ui-label-sm text-ui-label-sm tracking-widest uppercase">
                    온기 띄움 완료
                  </span>
                </div>
                <span className="font-caption text-caption text-tertiary tracking-tight">
                  2026. 11. 18 자정 배달 예정
                </span>
                <span className="font-ui-label-sm text-[10px] text-outline/80 tracking-wider">
                  여백 우체 인증
                </span>
              </div>
            </div>

            {/* Emotional Poetic Title & Subtitle */}
            <div className="space-y-3 mb-9">
              <h1 className="font-headline-lg text-2xl sm:text-headline-lg text-on-surface font-normal tracking-tight">
                온기가 밤하늘로
                <br />
                조용히 띄워졌습니다
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                익명의 이웃에게 띄운 당신의 다정한 마음 한 조각이, 오늘 밤 자정
                상대방의 우편함에 소리 없이 내려앉습니다.
              </p>
            </div>

            {/* Soft Ginkgo/Linen Receipt Slip Container */}
            <div className="bg-surface-container-low/90 rounded-lg p-5 mb-8 space-y-3.5 relative overflow-hidden">
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-caption text-caption text-tertiary shrink-0">
                  보낸 문구
                </span>
                <span className="font-body-sm text-body-sm text-on-surface text-right font-medium italic">
                  “{warmthMessage}”
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="font-caption text-caption text-tertiary shrink-0">
                  수신인
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  <span className="font-ui-label-md text-ui-label-md text-on-surface">
                    익명의 수신인 (11월 12일의 답장 이웃)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="font-caption text-caption text-tertiary shrink-0">
                  배송 방식
                </span>
                <span className="font-ui-label-md text-ui-label-md text-on-secondary-container bg-surface-container px-2 py-0.5 rounded">
                  느린 밤 우편 · 오늘 밤 24:00 도착
                </span>
              </div>
              <div className="pt-2 flex items-center justify-between text-tertiary/70 border-t border-outline-variant/25">
                <span className="font-ui-label-sm text-[11px] tracking-wider uppercase">
                  여백 갈무리 번호
                </span>
                <span className="font-ui-label-sm text-[11px] font-mono tracking-widest text-tertiary">
                  Seoul Post No. 1118-WARM-402
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 px-1 mb-9 text-tertiary">
              <span className="material-symbols-outlined text-[18px] text-secondary mt-0.5 shrink-0">
                nightlight
              </span>
              <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant/90">
                답장을 재촉하지 않는 고요한 편지입니다. 서로의 일상을 해치지
                않는 여백 속에서 따뜻한 온기만 남겨둡니다.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="w-full sm:flex-1 py-3 px-5 rounded-lg bg-primary-container hover:bg-primary text-on-primary text-center font-ui-label-md text-ui-label-md shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span>나의 서재로 돌아가기</span>
                <span className="material-symbols-outlined text-[16px]">
                  arrow_forward
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalMode(null);
                  onGoToTodaysMailbox();
                }}
                className="w-full sm:w-auto py-3 px-5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-center font-ui-label-md text-ui-label-md transition-all duration-200"
              >
                오늘 도착한 시 편지 보러가기
              </button>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-2 text-tertiary/60 select-none">
            <span className="font-caption text-caption tracking-widest uppercase">
              Night Postal Transit
            </span>
            <span className="text-[8px]">·</span>
            <span className="font-caption text-caption">자정 정각 일괄 전달</span>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // MAIN VIEW: page_4.html (나의 서재) + Modals (page_5, page_6, page_7)
  // ===========================================================================
  return (
    <div
      data-testid="my-library-view"
      className="max-w-[1100px] w-full mx-auto px-4 sm:px-6 py-8 relative"
    >
      {/* 1. Header / Overview Banner */}
      <header className="mb-space-xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
          <div>
            <div className="flex items-center gap-space-xs text-primary mb-1.5">
              <span className="material-symbols-outlined text-[18px]">
                auto_stories
              </span>
              <span className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-primary font-semibold">
                Archived Memory Log
              </span>
            </div>
            <h1 className="font-headline-lg text-2xl sm:text-headline-lg text-on-surface tracking-tight">
              나의 서재
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1.5 max-w-xl">
              계절의 틈새마다 적어 내려간 당신의 고요한 기록들입니다. 흩어지지
              않게 묶어둔 생각의 책장을 넘겨보세요.
            </p>
          </div>

          {/* Quick Statistics Ribbon */}
          <div className="flex items-center gap-space-sm bg-surface-container-low px-5 py-3 rounded-xl shadow-sm self-start md:self-auto">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[17px] text-tertiary">
                edit_note
              </span>
              <div className="flex flex-col">
                <span className="font-caption text-caption text-on-surface-variant">
                  모인 글
                </span>
                <span className="font-ui-label-md text-ui-label-md text-on-surface font-semibold">
                  42편
                </span>
              </div>
            </div>
            <span className="w-px h-6 bg-outline-variant/50" />
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#8E281C] text-surface-container-lowest text-[9px] font-headline-md tracking-tighter shadow-xs ring-1 ring-[#B84A39]/60 select-none shrink-0">
                餘白
              </div>
              <div className="flex flex-col">
                <span className="font-caption text-caption text-on-surface-variant">
                  보낸 시 편지
                </span>
                <span className="font-ui-label-md text-ui-label-md text-primary font-semibold">
                  12편
                </span>
              </div>
            </div>
            <span className="w-px h-6 bg-outline-variant/50" />
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[17px] text-secondary">
                park
              </span>
              <div className="flex flex-col">
                <span className="font-caption text-caption text-on-surface-variant">
                  머문 계절
                </span>
                <span className="font-ui-label-md text-ui-label-md text-secondary font-semibold">
                  늦가을
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Split-View Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Left Sidebar (4 cols) */}
        <aside className="lg:col-span-4 flex flex-col gap-space-md">
          {/* Calendar Widget Card */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/25">
            <div className="flex items-center justify-between mb-space-md">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">
                  calendar_month
                </span>
                <h2 className="font-title-md text-title-md text-on-surface tracking-tight">
                  2026년 11월
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="이전 달"
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    chevron_left
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="다음 달"
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    chevron_right
                  </span>
                </button>
              </div>
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-y-2.5 text-center text-caption mb-3">
              {["일", "월", "화", "수", "목", "금", "토"].map((d, idx) => (
                <span
                  key={d}
                  className={`font-caption text-caption font-medium ${
                    idx === 0 ? "text-primary/70" : "text-on-surface-variant"
                  }`}
                >
                  {d}
                </span>
              ))}
              {CALENDAR_DAYS_NOV_2026.map(
                ({ day, hasPrivateDot, hasSentDot }) => {
                  const isSelected = selectedDay === day;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        setSelectedDay(day);
                        if (day === 15) {
                          const entry15 = libraryEntries.find(
                            (e) => e.id === "stitch-entry-nov15"
                          );
                          if (entry15) handleOpenEntry(entry15);
                        } else if (day === 18 || day === 11) {
                          const entry18 = libraryEntries.find(
                            (e) => e.id === "stitch-entry-nov18"
                          );
                          if (entry18) handleOpenEntry(entry18);
                        }
                      }}
                      className={`group relative flex flex-col items-center justify-center h-8 rounded-lg transition-colors ${
                        isSelected
                          ? "bg-primary text-on-primary shadow-sm ring-2 ring-primary/20"
                          : day === 11 || day === 15
                          ? "bg-surface-container-high text-primary font-bold"
                          : "hover:bg-surface-container text-on-surface"
                      }`}
                    >
                      <span className="font-ui-label-sm text-ui-label-sm">
                        {day}
                      </span>
                      {hasPrivateDot && (
                        <span
                          className={`absolute bottom-0.5 w-1.5 h-1.5 rounded-full ${
                            isSelected
                              ? "bg-surface-container-lowest"
                              : "bg-primary"
                          }`}
                        />
                      )}
                      {hasSentDot && !hasPrivateDot && (
                        <span className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full bg-secondary-container" />
                      )}
                    </button>
                  );
                }
              )}
            </div>

            {/* Calendar Footer Legend */}
            <div className="pt-3 flex items-center justify-between text-caption text-on-surface-variant border-t border-outline-variant/20">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="font-caption text-caption">나만의 사색</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-[#8E281C] text-surface-container-lowest text-[6px] font-headline-md ring-1 ring-[#B84A39]/50 select-none">
                  餘
                </span>
                <span className="font-caption text-caption">
                  보낸 편지 (봉인)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary ring-2 ring-primary/20" />
                <span className="font-caption text-caption">오늘 (18일)</span>
              </div>
            </div>
          </div>

          {/* Monthly Mood & Color Summary Card (11월의 마음 팔레트) */}
          <div className="bg-surface-container-low rounded-xl p-6 shadow-sm border border-outline-variant/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-title-md text-title-md text-on-surface">
                11월의 마음 팔레트
              </h3>
              <span className="font-caption text-caption text-tertiary">
                30일간의 결
              </span>
            </div>

            {/* Mood Spectrum Bar */}
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-surface-container-highest mb-4">
              <div
                className="h-full bg-primary-container"
                style={{ width: "55%" }}
                title="차분한 사색 55%"
              />
              <div
                className="h-full bg-secondary-container"
                style={{ width: "30%" }}
                title="따스한 온기 30%"
              />
              <div
                className="h-full bg-tertiary-container"
                style={{ width: "15%" }}
                title="깊은 고요 15%"
              />
            </div>

            {/* Mood Breakdown Metrics */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between font-caption text-caption">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary-container" />
                  <span className="text-on-surface">차분한 사색 (단풍빛)</span>
                </div>
                <span className="font-ui-label-sm text-ui-label-sm text-on-surface font-semibold">
                  55%
                </span>
              </div>
              <div className="flex items-center justify-between font-caption text-caption">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary-container" />
                  <span className="text-on-surface">
                    따스한 온기 (은행잎 노랑)
                  </span>
                </div>
                <span className="font-ui-label-sm text-ui-label-sm text-on-surface font-semibold">
                  30%
                </span>
              </div>
              <div className="flex items-center justify-between font-caption text-caption">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-tertiary-container" />
                  <span className="text-on-surface">깊은 고요 (갈색 토양)</span>
                </div>
                <span className="font-ui-label-sm text-ui-label-sm text-on-surface font-semibold">
                  15%
                </span>
              </div>
            </div>

            <div className="bg-surface-container rounded-lg p-3.5 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-tertiary shrink-0 mt-0.5">
                spa
              </span>
              <p className="font-body-sm text-body-sm text-tertiary italic leading-snug">
                &ldquo;이번 달은 사색과 온기가 머무는 날들이 많았습니다. 조금씩
                느려지는 걸음걸이가 잘 어울려요.&rdquo;
              </p>
            </div>
          </div>

          {/* Serene Bookmark Accent Banner */}
          <div className="bg-surface-container-highest rounded-xl p-5 shadow-sm relative overflow-hidden">
            <div className="relative z-10 flex flex-col gap-2">
              <span className="font-ui-label-sm text-ui-label-sm text-primary tracking-wider uppercase font-semibold">
                책갈피 구절
              </span>
              <p className="font-body-sm text-body-sm text-on-surface font-medium leading-relaxed">
                &ldquo;스스로를 비워낸 나무만이 다음 봄의 눈부신 연둣빛을 맞이할
                수 있다.&rdquo;
              </p>
              <span className="font-caption text-caption text-on-surface-variant self-end">
                — 늦가을 산책길 메모 중에서
              </span>
            </div>
          </div>
        </aside>

        {/* Right Main Panel (8 cols) */}
        <section className="lg:col-span-8 flex flex-col gap-space-md">
          {/* Filter Tabs Bar */}
          <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 p-1 bg-surface-container-low rounded-xl flex-wrap">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`px-4 py-1.5 rounded-lg font-ui-label-md text-ui-label-md transition-all ${
                  filter === "all"
                    ? "bg-surface-container-lowest text-on-surface shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                전체 (42)
              </button>
              <button
                type="button"
                onClick={() => setFilter("private")}
                className={`px-4 py-1.5 rounded-lg font-ui-label-md text-ui-label-md transition-all ${
                  filter === "private"
                    ? "bg-surface-container-lowest text-on-surface shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                비공개 글 (30)
              </button>
              <button
                type="button"
                onClick={() => setFilter("sent")}
                className={`px-4 py-1.5 rounded-lg font-ui-label-md text-ui-label-md transition-all ${
                  filter === "sent"
                    ? "bg-surface-container-lowest text-on-surface shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#8E281C] text-surface-container-lowest text-[7px] font-headline-md select-none">
                    餘
                  </span>
                  <span>발송된 편지 (12)</span>
                </span>
              </button>
            </div>
          </div>

          {/* Timeline Entries Container */}
          <div className="flex flex-col gap-space-md">
            {libraryEntries.map((entry) => {
              const isSent = entry.is_public;
              return (
                <article
                  key={entry.id}
                  onClick={() => handleOpenEntry(entry)}
                  className="cursor-pointer group bg-surface-container-lowest rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 relative border border-outline-variant/25"
                >
                  <div
                    className={`absolute top-6 left-0 w-1.5 h-12 rounded-r ${
                      isSent ? "bg-secondary-container" : "bg-primary"
                    }`}
                  />
                  <div className="flex flex-col gap-3 pl-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-ui-label-md text-ui-label-md text-primary font-semibold">
                          {entry.created_at.slice(5, 10).replace("-", "월 ")}일
                        </span>
                        {isSent ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-container/15 text-primary border border-primary/30 font-ui-label-sm text-ui-label-sm shadow-xs">
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#8E281C] text-surface-container-lowest text-[8px] font-headline-md tracking-tighter shadow-inner ring-1 ring-[#B84A39]/60 leading-none select-none">
                              餘白
                            </span>
                            <span className="font-medium">발송 완료</span>
                            <span className="text-[10px] text-primary/70 font-caption">
                              (봉인)
                            </span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-ui-label-sm text-ui-label-sm flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">
                              lock
                            </span>
                            비공개
                          </span>
                        )}
                      </div>
                      <span className="material-symbols-outlined text-[20px] text-on-surface-variant/50">
                        bookmark
                      </span>
                    </div>

                    <div>
                      <h3 className="font-headline-md text-headline-md text-on-surface group-hover:text-primary transition-colors tracking-tight mb-2">
                        {entry.title}
                      </h3>
                      <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed line-clamp-2 whitespace-pre-line">
                        {entry.content}
                      </p>
                    </div>

                    <div
                      className="pt-2 flex flex-wrap items-center justify-between gap-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {entry.emotion_tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2.5 py-0.5 rounded bg-surface-container-low text-secondary font-caption text-caption font-medium"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        {isSent ? (
                          <>
                            <button
                              type="button"
                              data-testid={`open-reply-modal-${entry.id}`}
                              onClick={() => {
                                setSelectedPost(entry);
                                setModalMode("reply-detail");
                              }}
                              className="px-3 py-1.5 rounded-lg bg-secondary-fixed text-on-secondary-fixed font-ui-label-md text-ui-label-md flex items-center gap-1.5 hover:bg-secondary-fixed-dim transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px] text-secondary">
                                mark_chat_unread
                              </span>
                              <span>받은 답장 1건</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPost(entry);
                                setModalMode("reply-detail");
                              }}
                              className="px-4 py-1.5 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-variant font-ui-label-md text-ui-label-md transition-colors"
                            >
                              다시 읽기
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                onDispatchPrivatePost(entry.id);
                              }}
                              className="px-3.5 py-1.5 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-variant font-ui-label-md text-ui-label-md transition-colors flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[15px] text-primary">
                                send
                              </span>
                              <span>편지로 발송</span>
                            </button>
                            <button
                              type="button"
                              data-testid={`open-private-modal-${entry.id}`}
                              onClick={() => {
                                setSelectedPost(entry);
                                setModalMode("private-detail");
                              }}
                              className="px-4 py-1.5 rounded-lg bg-primary text-on-primary font-ui-label-md text-ui-label-md hover:bg-primary-container shadow-sm transition-colors"
                            >
                              다시 읽기
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      {/* =====================================================================
          MODAL 1: page_5.html — 비공개 기록 상세 모달
         ===================================================================== */}
      {modalMode === "private-detail" && selectedPost && (
        <div
          id="modal-container"
          data-testid="private-record-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-inverse-surface/40 backdrop-blur-[4px]"
        >
          <div className="relative w-full max-w-[680px] max-h-[90vh] flex flex-col bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-secondary-fixed via-primary-container to-secondary-fixed opacity-75" />

            {/* MODAL HEADER */}
            <div className="px-6 sm:px-8 pt-7 pb-5 bg-surface-container-lowest flex items-start justify-between">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-fixed/50 text-on-secondary-fixed font-ui-label-sm text-ui-label-sm">
                    <span className="w-2 h-2 rounded-full bg-primary-container inline-block shadow-sm" />
                    잔잔한 단풍빛 (사색)
                  </span>
                  <span className="font-caption text-caption text-on-surface-variant/70">
                    ·
                  </span>
                  <span className="font-caption text-caption text-tertiary tracking-wide">
                    일일 서재 기록
                  </span>
                </div>
                <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight mt-0.5">
                  2026년 11월 18일 수요일{" "}
                  <span className="text-tertiary font-body-sm text-body-sm font-normal ml-1">
                    · 늦가을 맑음
                  </span>
                </h2>
              </div>
              <button
                type="button"
                aria-label="기록 닫기"
                onClick={() => setModalMode(null)}
                className="p-2 rounded-lg text-tertiary hover:text-on-surface hover:bg-surface-container transition-all"
              >
                <span className="material-symbols-outlined text-[22px]">
                  close
                </span>
              </button>
            </div>

            <div className="w-full px-8">
              <div className="h-[1px] w-full bg-surface-variant/60" />
            </div>

            {/* MODAL BODY */}
            <div className="px-6 sm:px-8 py-6 overflow-y-auto space-y-6 flex-1 bg-surface-container-lowest">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="inline-flex items-center gap-1.5 text-on-surface-variant font-ui-label-sm text-ui-label-sm bg-surface-container-low px-2.5 py-1 rounded-md">
                  <span className="material-symbols-outlined text-[14px] text-tertiary">
                    lock
                  </span>
                  <span>단편 시 (Poem) · 비공개 보관 (RLS 본인 전용)</span>
                </div>
                <div className="flex items-center gap-1 text-tertiary font-caption text-caption tracking-widest uppercase opacity-75">
                  <span className="material-symbols-outlined text-sm">
                    mark_email_read
                  </span>
                  <span>SEOUL POST · NO.1118</span>
                </div>
              </div>

              <article className="bg-surface-container-low/40 rounded-xl p-6 sm:p-7 relative">
                <h3 className="font-headline-lg text-xl sm:text-headline-lg text-on-surface mb-6 tracking-tight">
                  {selectedPost.title}
                </h3>
                <div className="font-body-lg text-base sm:text-body-lg text-on-surface leading-[34px] space-y-4 whitespace-pre-line pl-2 border-l-2 border-primary/20">
                  {selectedPost.content}
                </div>
              </article>

              <div className="bg-secondary-fixed/30 rounded-xl p-5 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-secondary text-[18px]">
                    psychology_alt
                  </span>
                  <span className="font-ui-label-sm text-ui-label-sm text-on-secondary-fixed-variant">
                    오늘 남겨둔 감정 메모
                  </span>
                </div>
                <p className="font-body-md text-body-md text-on-surface leading-relaxed pl-1 italic">
                  “바람이 차가워졌지만, 마음만은 서둘러 닫지 않기로 한 날.”
                </p>
              </div>

              {modalActionFeedback && (
                <div className="p-3 rounded-lg bg-surface-container-high text-xs text-primary font-medium">
                  {modalActionFeedback}
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="px-6 sm:px-8 py-5 bg-surface-container-low/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => {
                  setModalMode(null);
                  onGoToTodaysMailbox();
                }}
                className="group inline-flex items-center gap-1.5 font-body-sm text-body-sm text-tertiary hover:text-primary transition-colors py-1"
              >
                <span className="material-symbols-outlined text-[18px]">
                  menu_book
                </span>
                <span className="underline decoration-secondary/40 underline-offset-4">
                  이 날의 시 편지 다시보기 (나태주 &lt;가을의 여백&gt;)
                </span>
              </button>

              <div className="flex items-center gap-2.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setModalActionFeedback(
                      "서재 편집 모드로 전환되었습니다."
                    );
                    setTimeout(() => setModalActionFeedback(null), 1800);
                  }}
                  className="px-4 py-2 rounded-lg bg-surface-container-lowest text-on-surface font-ui-label-md text-ui-label-md shadow-sm hover:bg-surface-container-high transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px] text-tertiary">
                    edit
                  </span>
                  수정하기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDispatchPrivatePost(selectedPost.id);
                    setModalActionFeedback(
                      "봉인 준비 완료: 다른 이웃의 우편함으로 발송 전환되었습니다."
                    );
                    setTimeout(() => {
                      setModalActionFeedback(null);
                      setModalMode(null);
                    }, 1400);
                  }}
                  className="px-5 py-2 rounded-lg bg-primary-container text-on-primary-container font-ui-label-md text-ui-label-md shadow-md hover:bg-primary transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    send
                  </span>
                  편지로 발송하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: page_6.html — 주고받은 답장 열람 모달
         ===================================================================== */}
      {modalMode === "reply-detail" && selectedPost && (
        <div
          id="modalOverlay"
          data-testid="reply-detail-modal"
          className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 md:p-10 overflow-y-auto"
        >
          <div className="relative w-full max-w-[820px] my-auto bg-surface-container-lowest rounded-lg shadow-2xl overflow-hidden flex flex-col">
            {/* Top Decorative Paper Edge & Wax Seal Header */}
            <div className="relative bg-surface-container-low px-6 sm:px-8 pt-7 pb-6 flex flex-col gap-4">
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setModalMode(null)}
                className="absolute top-6 right-6 w-9 h-9 rounded-full bg-surface-container-lowest/80 text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors flex items-center justify-center shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>

              <div className="flex flex-wrap items-center gap-2.5 pr-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-primary-container text-on-primary-container font-ui-label-sm text-ui-label-sm tracking-wider uppercase shadow-xs">
                  <span className="material-symbols-outlined text-[13px]">
                    mail
                  </span>
                  발송된 편지 · 1개의 답장 도착
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container text-tertiary font-ui-label-sm text-ui-label-sm">
                  <span className="material-symbols-outlined text-[13px]">
                    verified
                  </span>
                  익명 우편 발송 완료
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <span className="font-headline-md text-headline-md font-medium text-on-surface">
                      2026년 11월 15일 일요일
                    </span>
                    <span className="w-1 h-1 rounded-full bg-outline-variant" />
                    <span className="font-ui-label-md text-ui-label-md text-tertiary">
                      오후 04:15 발송
                    </span>
                  </div>
                  <p className="font-caption text-caption text-on-surface-variant/80 tracking-wide">
                    우편 일련번호 Seoul Post No. 1115-S · 익명의 이웃에게 닿은 편지
                  </p>
                </div>

                <div className="self-start sm:self-auto flex items-center gap-3 px-3.5 py-2 rounded-lg bg-surface-container/70 shadow-xs">
                  <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shadow-xs">
                    <span
                      className="material-symbols-outlined text-[15px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      local_post_office
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-ui-label-sm text-ui-label-sm text-primary font-semibold tracking-wider">
                      여백 도장
                    </span>
                    <span className="font-caption text-[10px] text-tertiary leading-none">
                      도장 찍힘 · 서재 간직
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable Letter Body Area */}
            <div className="px-6 sm:px-10 py-8 flex flex-col gap-8 bg-surface-container-lowest">
              {/* CARD 1: 내가 보낸 편지 */}
              <div className="relative bg-surface rounded-lg p-6 sm:p-8 shadow-sm flex flex-col gap-5 border border-outline-variant/25">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary-container" />
                    <span className="font-ui-label-sm text-ui-label-sm text-tertiary tracking-widest uppercase">
                      내가 보낸 원문 편지
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-ui-label-sm text-ui-label-sm text-tertiary/75">
                    <span>머문 시간 18분</span>
                    <span className="opacity-30">·</span>
                    <span>단어 수 {selectedPost.content.length}자</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <h3 className="font-headline-lg text-xl sm:text-headline-lg text-on-surface tracking-tight">
                    {selectedPost.title}
                  </h3>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedPost.emotion_tags.map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-ui-label-sm text-ui-label-sm"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="font-body-lg text-base sm:text-body-lg text-on-surface space-y-4 pt-2 pb-2 leading-relaxed whitespace-pre-line">
                  {selectedPost.content}
                </div>
              </div>

              {/* DIVIDER & TRANSITION */}
              <div className="relative py-2 flex items-center justify-center">
                <div className="w-full h-[1px] bg-outline-variant/40" />
                <div className="absolute px-5 py-1.5 rounded-full bg-surface-container-high shadow-xs flex items-center gap-2 text-on-surface">
                  <div className="w-5 h-5 rounded-full bg-secondary text-on-secondary flex items-center justify-center text-[11px] shadow-inner font-bold">
                    답
                  </div>
                  <span className="font-ui-label-sm text-ui-label-sm text-on-surface font-medium">
                    익명의 산책자가 보낸 따스한 답장이 도착했습니다
                  </span>
                </div>
              </div>

              {/* CARD 2: 받은 답장 */}
              <div className="relative bg-secondary-fixed/20 rounded-lg p-6 sm:p-8 shadow-sm flex flex-col gap-5 border border-secondary/20">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded bg-secondary text-on-secondary font-ui-label-sm text-ui-label-sm shadow-xs">
                      <span className="material-symbols-outlined text-[13px]">
                        volunteer_activism
                      </span>
                      익명의 온기 답장
                    </span>
                    <span className="font-caption text-caption text-secondary font-medium">
                      서울의 어느 창가에서
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-secondary font-ui-label-sm text-ui-label-sm">
                    <span className="material-symbols-outlined text-[14px]">
                      schedule
                    </span>
                    <span>18시간 후 화답됨</span>
                  </div>
                </div>

                <div className="font-body-lg text-base sm:text-body-lg text-on-surface space-y-4 pt-2 pb-2 leading-relaxed">
                  <p>
                    보내주신 차 한 잔의 온기가 오늘 저의 시린 퇴근길에 큰 위로가
                    되었습니다.
                  </p>
                  <p>
                    계절이 바뀌는 틈새에서 문득 쓸쓸해지던 참이었는데, 누군가 건넨
                    다정한 안부 덕분에 가슴 한 켠이 환하게 밝아졌어요.
                  </p>
                  <p>
                    저 또한 마음에 작은 찻잔을 품고 내일을 살아갈 힘을 얻었습니다.
                    고맙습니다.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Modal Actions Bar */}
            <div className="px-6 sm:px-10 py-5 bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setIsBookmarkedReply((p) => !p)}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded text-on-surface font-ui-label-md text-ui-label-md shadow-xs transition-colors ${
                  isBookmarkedReply
                    ? "bg-secondary-fixed/40"
                    : "bg-surface-container-lowest hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined text-[18px] text-secondary">
                  {isBookmarkedReply ? "bookmark" : "bookmark_border"}
                </span>
                <span>
                  {isBookmarkedReply ? "책갈피에 보관됨" : "책갈피에 간직하기"}
                </span>
              </button>

              <div className="w-full sm:w-auto flex items-center justify-end gap-3">
                <button
                  type="button"
                  id="shortReplyBtn"
                  data-testid="open-send-warmth-modal-btn"
                  onClick={() => setModalMode("send-warmth")}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded bg-primary-container text-on-primary-container font-ui-label-md text-ui-label-md shadow-sm hover:brightness-105 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    mail
                  </span>
                  <span>마음 답장 보내기 (한 줄 안부)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded bg-surface-container text-on-surface font-ui-label-md text-ui-label-md hover:bg-surface-container-high transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: page_7.html — 마음 답장 보내기 (답장에 온기를 띄웁니다)
         ===================================================================== */}
      {modalMode === "send-warmth" && (
        <div
          id="modal-container"
          data-testid="send-warmth-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-inverse-surface/45 backdrop-blur-md"
        >
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-[560px] bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="h-1.5 w-full bg-gradient-to-r from-primary via-secondary-container to-primary-container opacity-85" />

            <div className="px-6 sm:px-8 pt-7 pb-8 flex flex-col space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-sm shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[20px]">
                      mail
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded bg-surface-container text-primary font-ui-label-sm text-ui-label-sm font-semibold tracking-wider">
                        온기 전하기 · 짧은 감사
                      </span>
                      <span className="inline-block w-1 h-1 rounded-full bg-outline-variant" />
                      <span className="font-caption text-caption text-on-surface-variant">
                        밤 자정 발송
                      </span>
                    </div>
                    <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">
                      답장에 온기를 띄웁니다
                    </h2>
                    <p className="font-body-sm text-body-sm text-tertiary mt-1">
                      익명의 이웃이 건넨 다정한 문장에 작은 마음의 조각을
                      덧붙여보세요.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="팝업 닫기"
                  onClick={() => setModalMode(null)}
                  className="text-on-surface-variant/70 hover:text-on-surface hover:bg-surface-container p-1.5 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    close
                  </span>
                </button>
              </div>

              {/* Received Reply Reference Snippet Box */}
              <div className="relative bg-surface-container-high/60 rounded-xl p-4 pl-5 overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary" />
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">
                    format_quote
                  </span>
                  <div className="flex flex-col space-y-1">
                    <p className="font-body-sm text-body-sm text-on-surface italic leading-relaxed">
                      “보내주신 차 한 잔의 온기가 오늘 저의 시린 퇴근길에 큰
                      위로가 되었습니다.”
                    </p>
                    <div className="flex items-center justify-end gap-1.5 pt-0.5">
                      <span className="font-caption text-caption text-tertiary">
                        — 익명의 수신인
                      </span>
                      <span className="font-caption text-caption text-tertiary/60">
                        · 11월 12일의 답장
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Warm Expression Chips */}
              <div className="flex flex-col space-y-2.5">
                <label className="font-ui-label-sm text-ui-label-sm text-on-surface-variant tracking-wide font-medium">
                  선택 가능한 온기 문구{" "}
                  <span className="text-tertiary font-normal">
                    (하나를 누르면 문장에 스며듭니다)
                  </span>
                </label>
                <div className="flex flex-wrap gap-2" id="warm-chips-group">
                  {WARM_CHIPS.map((chip, idx) => {
                    const isSelected = selectedWarmChipIdx === idx;
                    return (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => {
                          setSelectedWarmChipIdx(idx);
                          setWarmthMessage(chip.text);
                        }}
                        className={`chip-button px-3 py-1.5 rounded-lg font-body-sm text-body-sm transition-all duration-200 flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-primary-fixed text-on-primary-fixed shadow-sm"
                            : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                        }`}
                      >
                        <span className="text-sm">{chip.emoji}</span>
                        <span>{chip.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message Compose Area */}
              <div className="flex flex-col space-y-1.5">
                <div className="relative bg-surface-container-low rounded-xl p-3.5 focus-within:bg-surface-container-lowest transition-all border border-outline-variant/25">
                  <textarea
                    id="message-input"
                    maxLength={100}
                    rows={3}
                    value={warmthMessage}
                    onChange={(e) => setWarmthMessage(e.target.value)}
                    placeholder="마음을 담은 짧은 한두 줄을 적어주세요. 긴 문장이 아니어도 충분합니다... (최대 100자)"
                    className="w-full bg-transparent resize-none font-body-md text-body-md text-on-surface placeholder:text-outline/70 focus:outline-none leading-relaxed tracking-wide"
                  />
                  <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-outline-variant/30 text-tertiary">
                    <div className="flex items-center gap-1.5 font-caption text-caption text-tertiary">
                      <span className="material-symbols-outlined text-[15px]">
                        edit_note
                      </span>
                      <span>정갈한 감사의 필적</span>
                    </div>
                    <div className="font-caption text-caption">
                      <span
                        className={`font-medium ${
                          warmthMessage.length >= 95
                            ? "text-error"
                            : "text-primary"
                        }`}
                      >
                        {warmthMessage.length}
                      </span>{" "}
                      / 100자
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-surface-container/60 text-on-surface-variant">
                <span className="material-symbols-outlined text-[17px] text-tertiary shrink-0 mt-0.5">
                  spa
                </span>
                <p className="font-caption text-caption leading-relaxed">
                  부담을 주지 않는 단방향 감사의 쪽지입니다. 별도의 대화창은
                  이어지지 않으며, 오늘 밤 자정 상대방의 우편함에 조용히
                  닿습니다.
                </p>
              </div>

              {/* Modal Action Footer */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2.5 rounded-lg font-ui-label-md text-ui-label-md text-tertiary hover:text-on-surface hover:bg-surface-container transition-colors"
                >
                  취소하고 닫기
                </button>
                <button
                  type="button"
                  id="send-button"
                  data-testid="confirm-send-warmth-btn"
                  onClick={handleSendWarmthSubmit}
                  className="px-5 py-2.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-ui-label-md text-ui-label-md shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    send
                  </span>
                  <span>온기 띄워보내기</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
