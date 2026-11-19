"use client";

import React, { useState } from "react";

export type WritingMode = "poem" | "diary" | "letter";

interface WritingEditorViewProps {
  onSavePost: (params: {
    title: string;
    content: string;
    category: "poem" | "diary";
    isPublic: boolean;
    mode: WritingMode;
  }) => Promise<void>;
}

const DEFAULT_CANVAS_TEXT = `길가에 구르는 낙엽 소리가
오늘따라 유난히 바스락거린다.
발끝에 닿는 계절의 무게만큼
내 마음에 남은 생각들도
하나씩 비워내고 싶다.`;

export default function WritingEditorView({
  onSavePost,
}: WritingEditorViewProps) {
  const [mode, setMode] = useState<WritingMode>("poem");
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>(DEFAULT_CANVAS_TEXT);
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [draftSavedNotice, setDraftSavedNotice] = useState<string | null>(null);

  // 줄바꿈 제외 실시간 글자 수 계산 (page_3.html 로직 동일)
  const charCount = content.replace(/[\n\r]/g, "").length;

  const handlePolishRhythm = () => {
    setContent((prev) =>
      prev
        .split("\n")
        .map((line) => line.trim())
        .join("\n")
    );
    setDraftSavedNotice("운율과 행간이 정갈하게 다듬어졌습니다.");
    setTimeout(() => setDraftSavedNotice(null), 2500);
  };

  const handleSaveDraft = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "mm_draft_v1",
        JSON.stringify({ mode, title, content, visibility })
      );
    }
    setDraftSavedNotice("임시 보관함에 조용히 갈무리되었습니다.");
    setTimeout(() => setDraftSavedNotice(null), 2500);
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);
    try {
      const resolvedTitle =
        title.trim() ||
        content.trim().split("\n")[0]?.slice(0, 24) ||
        "무제 (가을의 여백)";
      const category: "poem" | "diary" = mode === "diary" ? "diary" : "poem";
      await onSavePost({
        title: resolvedTitle,
        content: content.trim(),
        category,
        isPublic: visibility === "public",
        mode,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-testid="writing-editor-view"
      className="max-w-[1100px] w-full mx-auto px-4 sm:px-6 py-8 flex flex-col items-center"
    >
      <div className="w-full max-w-[840px] my-2">
        <div className="bg-surface-container-lowest rounded-xl shadow-xl shadow-on-surface/[0.04] p-6 sm:p-12 md:p-16 relative overflow-hidden transition-all duration-300 border border-outline-variant/25">
          {/* Top Bar: Date & 3 Mode Selector Pills */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-outline-variant/30">
            <div className="flex items-center gap-space-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-secondary text-[18px]">
                calendar_today
              </span>
              <p className="font-caption text-caption tracking-wider">
                2026. 11. 18 수요일 오후 3:45{" "}
                <span className="mx-1.5 text-outline-variant/60">·</span> 맑고
                서늘함
              </p>
            </div>

            <div
              className="inline-flex p-1 bg-surface-container-low rounded-lg gap-1 self-start md:self-auto flex-wrap"
              id="mode-selector"
            >
              {(
                [
                  { id: "poem", label: "단편 시 (Poem)" },
                  { id: "diary", label: "하루 단상 (Diary)" },
                  { id: "letter", label: "마음의 편지 (Letter)" },
                ] as const
              ).map((item) => {
                const isActive = mode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-mode={item.id}
                    onClick={() => setMode(item.id)}
                    className={`mode-pill px-3.5 py-1.5 rounded-DEFAULT font-ui-label-sm text-ui-label-sm transition-all flex items-center gap-1 ${
                      isActive
                        ? "bg-surface-container-lowest text-primary shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full inline-block ${
                        isActive ? "bg-primary" : "bg-transparent"
                      }`}
                    />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title Input */}
          <div className="pt-8 pb-4">
            <input
              id="writing-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 비워두어도 괜찮습니다 (선택)"
              className="w-full bg-transparent font-headline-lg text-xl sm:text-headline-lg text-on-surface placeholder:text-outline-variant/70 focus:outline-none tracking-tight pb-3 transition-colors"
            />
            <div className="w-12 h-[1px] bg-outline-variant/40 mt-2" />
          </div>

          {/* Writing Canvas Textarea */}
          <div className="relative py-6">
            <textarea
              id="writing-canvas"
              rows={11}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="계절의 호흡을 담아 조용히 이야기를 적어보세요..."
              className="w-full bg-transparent font-body-lg text-base sm:text-body-lg text-on-surface leading-[2.2] placeholder:text-outline-variant/60 focus:outline-none resize-none selection:bg-secondary-fixed tracking-normal"
            />
          </div>

          {/* Status & Character Counter Row */}
          <div className="flex items-center justify-between pt-6 border-t border-outline-variant/20 mt-4 text-on-surface-variant font-caption text-caption flex-wrap gap-2">
            <div className="flex items-center gap-4 flex-wrap">
              <button
                type="button"
                onClick={handlePolishRhythm}
                className="group flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[16px] text-outline group-hover:text-primary transition-colors">
                  music_note
                </span>
                <span>운율 다듬기</span>
              </button>
              <span className="text-outline-variant/40">·</span>
              <span className="tracking-wide" id="char-counter">
                글자 수{" "}
                <strong className="font-medium text-on-surface">
                  {charCount}
                </strong>
                자
              </span>
              <span className="text-outline-variant/40">·</span>
              <span className="flex items-center gap-1 text-on-surface-variant/80">
                <span className="material-symbols-outlined text-[14px] text-tertiary">
                  check_circle
                </span>
                <span>자동 저장 완료 (방금)</span>
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="material-symbols-outlined text-outline text-[18px]">
                nature
              </span>
              <span className="text-outline-variant/80">가을의 숨결</span>
            </div>
          </div>

          {draftSavedNotice && (
            <div className="mt-4 px-4 py-2.5 rounded-lg bg-secondary-fixed/40 text-on-secondary-fixed text-xs font-medium">
              {draftSavedNotice}
            </div>
          )}

          {/* Visibility Radios & Submit Buttons */}
          <div className="mt-10 pt-8 border-t border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-5 flex-wrap">
                <label className="inline-flex items-center gap-2.5 cursor-pointer group">
                  <input
                    className="peer sr-only"
                    name="visibility"
                    type="radio"
                    value="private"
                    checked={visibility === "private"}
                    onChange={() => setVisibility("private")}
                  />
                  <span className="w-4 h-4 rounded-full border border-outline flex items-center justify-center peer-checked:border-primary peer-checked:bg-primary transition-all">
                    <span className="w-1.5 h-1.5 rounded-full bg-on-primary scale-0 peer-checked:scale-100 transition-transform" />
                  </span>
                  <span className="material-symbols-outlined text-[17px] text-tertiary-container group-hover:text-on-surface transition-colors">
                    lock
                  </span>
                  <span className="font-ui-label-md text-ui-label-md text-on-surface font-medium">
                    나의 서재에만 보관 (비공개)
                  </span>
                </label>

                <label className="inline-flex items-center gap-2.5 cursor-pointer group">
                  <input
                    className="peer sr-only"
                    name="visibility"
                    type="radio"
                    value="public"
                    checked={visibility === "public"}
                    onChange={() => setVisibility("public")}
                  />
                  <span className="w-4 h-4 rounded-full border border-outline flex items-center justify-center peer-checked:border-primary peer-checked:bg-primary transition-all">
                    <span className="w-1.5 h-1.5 rounded-full bg-on-primary scale-0 peer-checked:scale-100 transition-transform" />
                  </span>
                  <span className="material-symbols-outlined text-[17px] text-outline group-hover:text-primary transition-colors">
                    mail
                  </span>
                  <span className="font-ui-label-md text-ui-label-md text-on-surface-variant group-hover:text-on-surface transition-colors">
                    다른 사람의 우편함으로 발송 (공개)
                  </span>
                </label>
              </div>

              <p
                className="font-caption text-caption text-on-surface-variant pl-1 sm:pl-6 tracking-wide"
                id="visibility-desc"
              >
                {visibility === "public"
                  ? "정오의 우체통을 통해 무작위의 다정한 이웃 한 명에게 편지가 전달됩니다."
                  : "비공개 글은 오직 당신의 서재 캘린더에서만 조용히 열람할 수 있습니다."}
              </p>
            </div>

            <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="touch-target px-5 py-3 rounded-lg font-ui-label-md text-ui-label-md text-tertiary bg-surface-container-low hover:bg-surface-container transition-all active:scale-[0.98]"
              >
                임시 보관
              </button>
              <button
                type="button"
                id="btn-submit"
                disabled={isSubmitting || !content.trim()}
                onClick={handleSubmit}
                className="touch-target px-7 py-3 rounded-lg font-ui-label-md text-ui-label-md text-on-primary bg-primary-container hover:bg-primary transition-all shadow-sm active:scale-[0.98] flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {visibility === "public" ? "send" : "bookmark_heart"}
                </span>
                <span>
                  {visibility === "public"
                    ? "우편함으로 부치기"
                    : "서재에 간직하기"}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between px-4 text-on-surface-variant/70 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">
              edit_note
            </span>
            <span className="font-caption text-caption">
              여백의 원칙: 생각을 덜어낼수록 마음은 맑아집니다.
            </span>
          </div>
          <div className="font-caption text-caption tracking-wider uppercase opacity-60">
            № 20261118-YBAK
          </div>
        </div>
      </div>
    </div>
  );
}
