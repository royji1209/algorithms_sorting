"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type {
  EmotionCheckinResult,
  EmpathyComment,
  LetterDelivery,
  PoemPost,
} from "@/types/domain";
import { curateDailyLetters } from "@/lib/curation/letter-matcher";
import {
  filterPostsByRLS,
  INITIAL_SEED_COMMENTS,
  INITIAL_SEED_POSTS,
} from "@/lib/store/seed-data";

import WelcomeRitualView from "@/components/stitch/WelcomeRitualView";
import TodaysMailboxView from "@/components/stitch/TodaysMailboxView";
import WritingEditorView from "@/components/stitch/WritingEditorView";
import MyLibraryView from "@/components/stitch/MyLibraryView";
import NightSkyPostOfficeView from "@/components/stitch/NightSkyPostOfficeView";
import AdminConsoleView from "@/components/stitch/AdminConsoleView";

export type MainNavTab =
  | "mailbox"
  | "write"
  | "library"
  | "night-sky"
  | "admin";

const CURRENT_USER_ID = "user-me";
const CURRENT_USER_PEN_NAME = "달무리 서재";

export default function MarginMailboxHomePage() {
  const [showWelcomeRitual, setShowWelcomeRitual] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<MainNavTab>("mailbox");
  const [currentEmail, setCurrentEmail] = useState<string>(
    "admin@marginmailbox.kr"
  );
  const [adminDeniedNotice, setAdminDeniedNotice] = useState<boolean>(false);

  const [emotionInput, setEmotionInput] = useState<string>("");
  const [isCheckingIn, setIsCheckingIn] = useState<boolean>(false);
  const [checkinResult, setCheckinResult] =
    useState<EmotionCheckinResult | null>(null);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number>(3);

  const [posts, setPosts] = useState<PoemPost[]>(INITIAL_SEED_POSTS);
  const [comments, setComments] =
    useState<EmpathyComment[]>(INITIAL_SEED_COMMENTS);

  const [userWarmthNote, setUserWarmthNote] = useState<string>(
    "마음에 닿아 기쁩니다. 바람이 차가워지는 밤, 당신의 방 안은 온기로 가득하길 바랍니다."
  );
  const [nightPostToggle, setNightPostToggle] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasSeenWelcome = window.localStorage.getItem("mm_welcome_seen_v1");
      if (hasSeenWelcome === "true") {
        setShowWelcomeRitual(false);
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get("admin_denied") === "1") {
        setAdminDeniedNotice(true);
        setShowWelcomeRitual(false);
      }

      const savedPosts = window.localStorage.getItem("mm_posts_v1");
      if (savedPosts) {
        try {
          const parsed = JSON.parse(savedPosts);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPosts(parsed);
          }
        } catch {
          // ignore
        }
      }

      const match = document.cookie.match(/(?:^|;\s*)mm_user_email=([^;]*)/);
      if (match && match[1]) {
        setCurrentEmail(decodeURIComponent(match[1]));
      } else {
        document.cookie = `mm_user_email=${encodeURIComponent(
          "admin@marginmailbox.kr"
        )}; path=/; max-age=86400; SameSite=Lax`;
      }
    }
  }, []);

  const handleEnterSanctuary = useCallback(() => {
    setShowWelcomeRitual(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("mm_welcome_seen_v1", "true");
    }
  }, []);

  const handleSwitchRole = (email: string) => {
    setCurrentEmail(email);
    setAdminDeniedNotice(false);
    if (typeof document !== "undefined") {
      document.cookie = `mm_user_email=${encodeURIComponent(
        email
      )}; path=/; max-age=86400; SameSite=Lax`;
    }
  };

  const rlsVisiblePosts = useMemo(
    () => filterPostsByRLS(posts, CURRENT_USER_ID),
    [posts]
  );

  const dailyLetters: LetterDelivery[] = useMemo(() => {
    const valence =
      checkinResult && checkinResult.allowed ? checkinResult.valence : "neutral";
    const tags =
      checkinResult && checkinResult.allowed
        ? checkinResult.emotionTags
        : ["위로 필요", "평온"];

    return curateDailyLetters({
      allPosts: posts,
      userValence: valence,
      userEmotionTags: tags,
      recipientId: CURRENT_USER_ID,
      dayOfWeek: selectedDayOfWeek,
      maxLetters: 2,
    });
  }, [posts, checkinResult, selectedDayOfWeek]);

  const handleCheckinSubmit = async (overrideText?: string) => {
    const textToUse = (overrideText ?? emotionInput).trim();
    if (!textToUse) return;

    setIsCheckingIn(true);
    try {
      const response = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToUse,
          dayOfWeek: selectedDayOfWeek,
          userId: CURRENT_USER_ID,
        }),
      });
      const data = await response.json();
      if (data?.checkin) {
        setCheckinResult(data.checkin);
      }
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleSavePost = async (params: {
    title: string;
    content: string;
    category: "poem" | "diary";
    isPublic: boolean;
  }) => {
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: params.title,
        content: params.content,
        category: params.category,
        is_public: params.isPublic,
        author_id: CURRENT_USER_ID,
        author_pen_name: CURRENT_USER_PEN_NAME,
      }),
    });
    const data = await res.json();
    if (data?.post) {
      const updated = [data.post, ...posts];
      setPosts(updated);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("mm_posts_v1", JSON.stringify(updated));
      }
      setActiveTab("library");
    }
  };

  const handleDispatchPrivatePost = (postId: string) => {
    const updated = posts.map((p) =>
      p.id === postId ? { ...p, is_public: true } : p
    );
    setPosts(updated);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("mm_posts_v1", JSON.stringify(updated));
    }
  };

  const handleAddComment = async (
    postId: string,
    quotedLine: string,
    content: string
  ) => {
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        post_id: postId,
        quoted_line: quotedLine,
        content,
        author_pen_name: CURRENT_USER_PEN_NAME,
      }),
    });
    const data = await res.json();
    if (data?.comment) {
      setComments((prev) => [...prev, data.comment]);
    }
  };

  const navItems: Array<{ id: MainNavTab; label: string }> = [
    { id: "mailbox", label: "오늘의 편지함" },
    { id: "write", label: "글쓰기" },
    { id: "library", label: "나의 서재" },
    { id: "night-sky", label: "밤하늘 우체국" },
    { id: "admin", label: "관리자" },
  ];

  return (
    <div className="bg-surface text-on-surface font-body-md text-body-md antialiased min-h-dvh flex flex-col">
      <header className="fixed top-0 left-0 w-full z-50 bg-surface/90 backdrop-blur-md shadow-[0_1px_8px_rgba(34,26,20,0.03)] border-b border-outline-variant/30">
        <div className="min-h-[68px] max-w-[1100px] mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-space-sm">
            <button
              type="button"
              onClick={() => {
                setShowWelcomeRitual(false);
                setActiveTab("mailbox");
              }}
              className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-xs font-headline-md text-xs"
            >
              餘白
            </button>
            <div className="flex flex-col text-left">
              <button
                type="button"
                onClick={() => {
                  setShowWelcomeRitual(false);
                  setActiveTab("mailbox");
                }}
                className="font-headline-md text-lg sm:text-headline-md text-on-surface tracking-tight hover:text-primary transition-colors leading-none text-left"
              >
                여백의 우체통
              </button>
              <span className="font-caption text-caption text-on-surface-variant/80 tracking-normal mt-0.5">
                마음이 쉬어가는 한 줄
              </span>
            </div>
          </div>

          <nav aria-label="전체 네비게이션" className="flex items-center gap-1 sm:gap-space-xs flex-wrap">
            {navItems.map((tab) => {
              const isActive = !showWelcomeRitual && activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`nav-tab-${tab.id}`}
                  onClick={() => {
                    if (
                      tab.id === "admin" &&
                      currentEmail !== "admin@marginmailbox.kr" &&
                      currentEmail !== "curator@marginmailbox.kr"
                    ) {
                      setAdminDeniedNotice(true);
                      return;
                    }
                    setAdminDeniedNotice(false);
                    setShowWelcomeRitual(false);
                    setActiveTab(tab.id);
                  }}
                  className={
                    isActive
                      ? "px-3 sm:px-3.5 py-1.5 transition-all duration-200 bg-primary-container text-on-primary-container font-ui-label-md text-xs sm:text-ui-label-md shadow-sm rounded-lg"
                      : "px-3 sm:px-3.5 py-1.5 rounded-lg font-ui-label-md text-xs sm:text-ui-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all duration-200"
                  }
                >
                  {tab.label}
                </button>
              );
            })}
            <button
              type="button"
              data-testid="reopen-welcome-ritual-btn"
              onClick={() => setShowWelcomeRitual(true)}
              className={`px-2.5 py-1.5 rounded-lg font-ui-label-sm text-[11px] border transition-all ${
                showWelcomeRitual
                  ? "border-primary bg-primary-fixed text-primary font-semibold"
                  : "border-outline-variant/50 text-tertiary hover:text-primary"
              }`}
            >
              입실서신
            </button>
          </nav>
        </div>
      </header>

      <main className="w-full flex-1 pt-[76px] sm:pt-[68px] bg-surface flex flex-col">
        {adminDeniedNotice && (
          <div className="max-w-[1100px] w-full mx-auto px-4 sm:px-6 pt-4">
            <div role="alert" className="p-3.5 rounded-xl bg-error-container/50 border border-error/40 text-xs text-on-error-container flex items-center justify-between gap-2 flex-wrap">
              <span>현재 계정(<code>{currentEmail}</code>)은 <code>ADMIN_EMAILS</code> 화이트리스트에 등록되어 있지 않아 관리자 콘솔 접근이 차단되었습니다.</span>
              <button
                type="button"
                onClick={() => {
                  handleSwitchRole("admin@marginmailbox.kr");
                  setActiveTab("admin");
                }}
                className="px-3 py-1 rounded bg-primary text-on-primary font-medium"
              >
                관리자 계정으로 전환하여 열기
              </button>
            </div>
          </div>
        )}

        {showWelcomeRitual ? (
          <WelcomeRitualView
            penName={CURRENT_USER_PEN_NAME}
            onEnterSanctuary={handleEnterSanctuary}
            onNavigateTab={(tab) => {
              handleEnterSanctuary();
              setActiveTab(tab);
            }}
          />
        ) : (
          <>
            {activeTab === "mailbox" && (
              <TodaysMailboxView
                emotionInput={emotionInput}
                setEmotionInput={setEmotionInput}
                isCheckingIn={isCheckingIn}
                checkinResult={checkinResult}
                onCheckinSubmit={handleCheckinSubmit}
                dailyLetters={dailyLetters}
                selectedDayOfWeek={selectedDayOfWeek}
                setSelectedDayOfWeek={setSelectedDayOfWeek}
                comments={comments}
                onAddComment={handleAddComment}
                onGoToWriting={() => setActiveTab("write")}
                onGoToLibrary={() => setActiveTab("library")}
              />
            )}
            {activeTab === "write" && <WritingEditorView onSavePost={handleSavePost} />}
            {activeTab === "library" && (
              <MyLibraryView
                posts={rlsVisiblePosts}
                onDispatchPrivatePost={handleDispatchPrivatePost}
                onSendWarmthNoteToNightSky={(noteText) => setUserWarmthNote(noteText)}
                onGoToTodaysMailbox={() => setActiveTab("mailbox")}
              />
            )}
            {activeTab === "night-sky" && (
              <NightSkyPostOfficeView
                userWarmthNote={userWarmthNote}
                adminNightWindowEnabled={nightPostToggle}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}
            {activeTab === "admin" && (
              <AdminConsoleView
                nightPostToggle={nightPostToggle}
                setNightPostToggle={setNightPostToggle}
                onRegisterExpertPoem={(newPoem) => setPosts([newPoem, ...posts])}
              />
            )}
          </>
        )}
      </main>

      <footer className="w-full bg-surface-container-low/70 border-t border-outline-variant/20 py-6">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-caption text-caption text-on-surface-variant tracking-wide">
            조용히 머물다 떠나는 정갈한 여백의 공간 · 여백의 우체통
          </p>
          <div className="flex items-center gap-2 text-xs text-tertiary">
            <span>계정 권한 시뮬레이션:</span>
            <button type="button" onClick={() => handleSwitchRole("seoyeon@example.com")} className={`px-2 py-0.5 rounded ${currentEmail === "seoyeon@example.com" ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}>일반 독자</button>
            <button type="button" onClick={() => handleSwitchRole("admin@marginmailbox.kr")} className={`px-2 py-0.5 rounded ${currentEmail === "admin@marginmailbox.kr" ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}>관리자(ADMIN_EMAILS)</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
