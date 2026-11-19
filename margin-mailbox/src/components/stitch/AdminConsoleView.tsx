"use client";

import React, { useState } from "react";
import type { PoemPost } from "@/types/domain";

interface ModerationItem {
  id: string;
  code: string;
  meta: string;
  warningLabel: string;
  warningType: "tone" | "contact";
  excerpt: string;
  aiSuggestion?: string;
  aiReason?: string;
  maskedExcerpt?: string;
  status: "pending" | "approved" | "rejected";
  resolutionNote?: string;
}

interface AdminConsoleViewProps {
  nightPostToggle: boolean;
  setNightPostToggle: (val: boolean) => void;
  onRegisterExpertPoem?: (poem: PoemPost) => void;
}

export default function AdminConsoleView({
  nightPostToggle,
  setNightPostToggle,
  onRegisterExpertPoem,
}: AdminConsoleViewProps) {
  const [modTab, setModTab] = useState<"pending" | "approved" | "rejected">(
    "pending"
  );
  const [modItems, setModItems] = useState<ModerationItem[]>([
    {
      id: "184",
      code: "검수 대기 #184",
      meta: "익명 발송 · 오후 4:21 접수",
      warningLabel: "과도한 비하 표현 감지",
      warningType: "tone",
      excerpt:
        "“... 오늘 하루도 너무 지치고 다 때려치우고 싶었지만, 창밖에 부는 바람을 보며 마음을 식히려 애썼습니다. 아무도 알아주지 않는 기분이었어요 ...”",
      aiSuggestion:
        "“... 오늘 하루도 마음이 무너질 듯 버거운 날이었지만, 창밖에 부는 바람을 보며 마음을 식히려 애썼습니다. 아무도 알아주지 않는 기분이었어요 ...”",
      aiReason:
        "작성자의 진솔한 피로감과 아픔은 깊이 공감하면서도, 수신자에게 자극적인 분노가 전이되지 않도록 문장의 온도를 누그러뜨렸습니다.",
      status: "pending",
    },
    {
      id: "182",
      code: "검수 대기 #182",
      meta: "답장 편지 · 오후 3:45 접수",
      warningLabel: "개인 연락처 노출 주의",
      warningType: "contact",
      excerpt:
        "“... 지난번 보내주신 편지가 큰 힘이 되었습니다. 혹시 괜찮으시다면 카카오톡 아이디 @margin_mind 로 편하게 연락 주실 수 있나요? ...”",
      maskedExcerpt:
        "“... 지난번 보내주신 편지가 큰 힘이 되었습니다. 혹시 괜찮으시다면 카카오톡 아이디 ■■■ 로 편하게 연락 주실 수 있나요? ...”",
      status: "pending",
    },
  ]);

  // 내일의 아침 시 큐레이션 상태
  const [curatedPoem, setCuratedPoem] = useState({
    title: "풀꽃",
    poet: "나태주 시인",
    lines: ["자세히 보아야 예쁘다", "오래 보아야 사랑스럽다", "너도 그렇다."],
    reason: "선정 이유: 서늘한 가을 아침, 스스로를 위로할 수 있는 짧고 단단한 시선",
  });
  const [isEditingPoem, setIsEditingPoem] = useState<boolean>(false);
  const [newPoemTitle, setNewPoemTitle] = useState<string>("");
  const [newPoemPoet, setNewPoemPoet] = useState<string>("");
  const [newPoemBody, setNewPoemBody] = useState<string>("");
  const [newPoemReason, setNewPoemReason] = useState<string>("");
  const [adminToast, setAdminToast] = useState<string | null>(null);
  const [sanctuaryMaintenanceMode, setSanctuaryMaintenanceMode] =
    useState<boolean>(false);

  const pendingCount = modItems.filter((i) => i.status === "pending").length;
  const approvedCount =
    181 + modItems.filter((i) => i.status === "approved").length;
  const rejectedCount =
    2 + modItems.filter((i) => i.status === "rejected").length;

  const showToast = (msg: string) => {
    setAdminToast(msg);
    setTimeout(() => setAdminToast(null), 3200);
  };

  // 검수 처리 핸들러
  const handleModerationAction = (
    id: string,
    action: "soften_approve" | "raw_approve" | "mask_approve" | "reject"
  ) => {
    setModItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (action === "soften_approve") {
          return {
            ...item,
            excerpt: item.aiSuggestion || item.excerpt,
            status: "approved",
            resolutionNote: "AI 온기 순화 문장으로 다듬어 발송 승인됨",
          };
        }
        if (action === "mask_approve") {
          return {
            ...item,
            excerpt:
              item.maskedExcerpt || item.excerpt.replace(/@\S+/g, "■■■"),
            status: "approved",
            resolutionNote: "개인 연락처(■■■) 자동 마스킹 후 발송 승인됨",
          };
        }
        if (action === "raw_approve") {
          return {
            ...item,
            status: "approved",
            resolutionNote: "원문 그대로 발송 승인됨",
          };
        }
        return {
          ...item,
          status: "rejected",
          resolutionNote: "정중한 반려 및 작성자 위로 안내 발송됨",
        };
      })
    );

    if (action === "soften_approve") {
      showToast("검수 #184: AI 온기 순화 제안이 반영되어 승인되었습니다.");
    } else if (action === "mask_approve") {
      showToast("검수 #182: 연락처가 자동 마스킹(■■■) 처리되어 승인되었습니다.");
    } else if (action === "raw_approve") {
      showToast(`검수 #${id}: 원문 그대로 발송 승인되었습니다.`);
    } else {
      showToast(`검수 #${id}: 정중히 반려 및 위로 안내가 전달되었습니다.`);
    }
  };

  const handleSaveNewCuratedPoem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoemTitle.trim() || !newPoemBody.trim()) return;

    const lines = newPoemBody
      .trim()
      .split("\n")
      .filter((l) => l.trim().length > 0);

    setCuratedPoem({
      title: newPoemTitle.trim(),
      poet: newPoemPoet.trim() || "초대 시인",
      lines,
      reason:
        newPoemReason.trim() ||
        "선정 이유: 가을 아침 독자의 여백을 채우는 큐레이션 작품",
    });

    try {
      const res = await fetch("/api/admin/poems", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": "admin@marginmailbox.kr",
        },
        body: JSON.stringify({
          title: newPoemTitle.trim(),
          original_poet: newPoemPoet.trim() || "초대 시인",
          content: newPoemBody.trim(),
          expert_commentary: newPoemReason.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.post && onRegisterExpertPoem) {
          onRegisterExpertPoem(data.post);
        }
      }
    } catch {
      // ignore network error in local preview
    }

    setIsEditingPoem(false);
    setNewPoemTitle("");
    setNewPoemPoet("");
    setNewPoemBody("");
    setNewPoemReason("");
    showToast("내일의 아침 시 및 수요일 전문가 큐레이션이 교체되었습니다.");
  };

  const visibleModItems = modItems.filter((i) => i.status === modTab);

  return (
    <div
      data-testid="admin-console-view"
      className="relative w-full overflow-hidden pb-space-xl"
    >
      <div className="max-w-[1100px] w-full mx-auto px-4 sm:px-gutter flex flex-col gap-space-lg relative z-10 pt-space-md">
        {/* Admin Desk Intro Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-sm">
          <div className="flex flex-col gap-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
              <span className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-on-surface-variant">
                여백의 우체통 지기 집무실 · 우체국 관리 콘솔
              </span>
            </div>
            <h1 className="font-headline-lg text-2xl sm:text-headline-lg text-on-surface tracking-tight font-medium">
              사람의 온기가 온전하게 닿도록 보살피는 곳
            </h1>
            <p className="font-body-sm text-body-sm text-tertiary">
              성급한 말들은 고르고, 외로운 마음에 닿는 문장은 한 번 더 품어
              따뜻하게 부칩니다.
            </p>
          </div>

          <div className="flex items-center gap-space-xs bg-surface-container px-space-md py-2.5 rounded-full shadow-xs self-start md:self-auto">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary-container opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
            </span>
            <span className="font-ui-label-md text-ui-label-md text-on-surface font-medium">
              실시간 우체국 가동 중
            </span>
            <span className="text-outline-variant font-caption">·</span>
            <span className="font-caption text-caption text-tertiary">
              자정 배달 D-6시간 32분
            </span>
          </div>
        </section>

        {/* Key Metric Cards: 4 Serene Bento Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm">
          {/* Card 1 */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between border border-outline-variant/25">
            <div className="flex items-center justify-between">
              <span className="font-ui-label-sm text-ui-label-sm text-tertiary">
                오늘 접수된 온기
              </span>
              <span className="material-symbols-outlined text-primary text-[20px]">
                mark_email_unread
              </span>
            </div>
            <div className="my-space-sm flex items-baseline gap-2">
              <span className="font-display-lg text-3xl sm:text-display-lg text-on-surface font-normal">
                184
              </span>
              <span className="font-body-sm text-body-sm text-tertiary font-normal">
                통
              </span>
              <span className="font-ui-label-sm text-ui-label-sm text-primary bg-primary-fixed px-1.5 py-0.5 rounded ml-auto">
                +18%
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-on-surface-variant font-caption text-caption">
              <span className="material-symbols-outlined text-[14px] text-tertiary">
                forum
              </span>
              <span>따뜻한 답장 62통 포함</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between border border-outline-variant/25">
            <div className="flex items-center justify-between">
              <span className="font-ui-label-sm text-ui-label-sm text-tertiary">
                온기 순화 및 검수 대기
              </span>
              <span className="material-symbols-outlined text-secondary text-[20px]">
                healing
              </span>
            </div>
            <div className="my-space-sm flex items-baseline gap-2">
              <span className="font-display-lg text-3xl sm:text-display-lg text-primary font-normal">
                {pendingCount}
              </span>
              <span className="font-body-sm text-body-sm text-tertiary font-normal">
                건
              </span>
              <span className="font-ui-label-sm text-ui-label-sm text-tertiary ml-auto">
                평균 4분 소요
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-on-surface-variant font-caption text-caption">
              <span className="material-symbols-outlined text-[14px] text-secondary">
                verified_user
              </span>
              <span>마음 다침 방지 AI 필터링 완료</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between border border-outline-variant/25">
            <div className="flex items-center justify-between">
              <span className="font-ui-label-sm text-ui-label-sm text-tertiary">
                밤하늘 궤도 유영 편지
              </span>
              <span className="material-symbols-outlined text-tertiary text-[20px]">
                nights_stay
              </span>
            </div>
            <div className="my-space-sm flex items-baseline gap-2">
              <span className="font-display-lg text-3xl sm:text-display-lg text-on-surface font-normal">
                142
              </span>
              <span className="font-body-sm text-body-sm text-tertiary font-normal">
                통
              </span>
              <span className="font-ui-label-sm text-ui-label-sm text-secondary bg-secondary-fixed px-1.5 py-0.5 rounded ml-auto">
                {nightPostToggle ? "야간 유영" : "주간 대기"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-on-surface-variant font-caption text-caption">
              <span className="material-symbols-outlined text-[14px] text-tertiary">
                schedule
              </span>
              <span>자정 24:00 정시 배송 대기</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between border border-outline-variant/25">
            <div className="flex items-center justify-between">
              <span className="font-ui-label-sm text-ui-label-sm text-tertiary">
                내일의 시 큐레이션
              </span>
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                auto_stories
              </span>
            </div>
            <div className="my-space-sm flex items-baseline gap-2">
              <span className="font-headline-md text-headline-md text-on-surface font-medium truncate">
                준비 완료
              </span>
              <span className="w-2 h-2 rounded-full bg-secondary ml-auto" />
            </div>
            <div className="flex items-center gap-1.5 text-on-surface-variant font-caption text-caption truncate">
              <span className="material-symbols-outlined text-[14px] text-primary">
                eco
              </span>
              <span className="truncate">
                {curatedPoem.poet} ‘{curatedPoem.title}’ 조각 배정
              </span>
            </div>
          </div>
        </section>

        {/* Main Two-Column Working Desk */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          {/* Left Column: Moderation & Tone Care (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-space-md">
            <div>
              <span className="font-ui-label-sm text-ui-label-sm text-primary tracking-wider uppercase font-semibold">
                Care &amp; Moderation
              </span>
              <h2 className="font-headline-md text-headline-md text-on-surface font-medium">
                온기 돌봄 및 편지 검수함
              </h2>
              <p className="font-body-sm text-body-sm text-tertiary mt-0.5">
                서로에게 생채기가 되지 않도록, 거친 표현과 노출 위험을 조용히
                다듬습니다.
              </p>
            </div>

            {/* Tab Selector Pills */}
            <div className="flex items-center gap-2 p-1 bg-surface-container rounded-lg self-start flex-wrap">
              <button
                type="button"
                onClick={() => setModTab("pending")}
                className={`px-3.5 py-1.5 rounded-lg font-ui-label-md text-ui-label-md flex items-center gap-1.5 transition-all ${
                  modTab === "pending"
                    ? "bg-surface-container-lowest text-on-surface font-medium shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span>검수 대기</span>
                <span className="px-1.5 py-0.2 rounded-full bg-primary text-on-primary font-caption text-[10px]">
                  {pendingCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setModTab("approved")}
                className={`px-3.5 py-1.5 rounded-lg font-ui-label-md text-ui-label-md flex items-center gap-1.5 transition-all ${
                  modTab === "approved"
                    ? "bg-surface-container-lowest text-on-surface font-medium shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span>승인 완료</span>
                <span className="text-tertiary font-caption text-[10px]">
                  {approvedCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setModTab("rejected")}
                className={`px-3.5 py-1.5 rounded-lg font-ui-label-md text-ui-label-md flex items-center gap-1.5 transition-all ${
                  modTab === "rejected"
                    ? "bg-surface-container-lowest text-on-surface font-medium shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span>보류 및 완곡한 권고</span>
                <span className="text-tertiary font-caption text-[10px]">
                  {rejectedCount}
                </span>
              </button>
            </div>

            {/* Moderation Queue Items List */}
            <div className="flex flex-col gap-space-md">
              {visibleModItems.length === 0 ? (
                <div className="bg-surface-container-lowest rounded-xl p-8 text-center text-tertiary font-body-sm border border-outline-variant/25">
                  현재 이 탭에 해당하는 검수 항목이 모두 처리되었습니다.
                </div>
              ) : (
                visibleModItems.map((item) => (
                  <article
                    key={item.id}
                    data-testid={`moderation-card-${item.id}`}
                    className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm relative flex flex-col gap-space-sm border border-outline-variant/25"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-ui-label-sm text-ui-label-sm bg-primary-fixed text-on-primary-fixed-variant px-2 py-0.5 rounded font-semibold">
                          {item.code}
                        </span>
                        <span className="font-caption text-caption text-tertiary">
                          {item.meta}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-ui-label-sm text-[11px]">
                        <span className="material-symbols-outlined text-[13px] text-primary">
                          {item.warningType === "tone"
                            ? "warning"
                            : "contact_phone"}
                        </span>
                        <span>{item.warningLabel}</span>
                      </div>
                    </div>

                    <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col gap-2">
                      <div className="flex items-center justify-between font-caption text-caption text-tertiary">
                        <span>작성자의 편지 발췌</span>
                        <span className="font-caption text-[11px]">
                          {item.resolutionNote || "검수 진행 중"}
                        </span>
                      </div>
                      <blockquote className="font-body-md text-body-md text-on-surface italic pl-3 border-l-2 border-primary/40 leading-relaxed">
                        {item.excerpt}
                      </blockquote>
                    </div>

                    {item.warningType === "tone" && item.aiSuggestion && (
                      <div className="bg-secondary-fixed/30 p-space-sm rounded-lg flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-secondary text-[16px]">
                            psychology
                          </span>
                          <span className="font-ui-label-md text-ui-label-md text-secondary font-semibold">
                            온기 순화 가이드 제안
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface">
                          수정 제안:{" "}
                          <span className="font-medium text-primary">
                            “... 오늘 하루도 마음이 무너질 듯 버거운 날이었지만
                            ...”
                          </span>
                        </p>
                        <p className="font-caption text-caption text-on-surface-variant">
                          이유: {item.aiReason}
                        </p>
                      </div>
                    )}

                    {item.warningType === "contact" && (
                      <div className="bg-surface-container p-space-sm rounded-lg flex items-start gap-2">
                        <span className="material-symbols-outlined text-tertiary text-[16px] mt-0.5">
                          policy
                        </span>
                        <p className="font-caption text-caption text-on-surface-variant leading-relaxed">
                          <strong className="font-medium text-on-surface">
                            여백의 우체통 규약 제3조 (안전한 익명성):
                          </strong>
                          <br />
                          모든 온기는 주소와 신원이 감추어진 상태에서 더 순수하게
                          전해집니다. 연락처는 마스킹(■■■) 처리되어 부쳐집니다.
                        </p>
                      </div>
                    )}

                    {item.status === "pending" && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        {item.warningType === "tone" ? (
                          <>
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                data-testid="approve-soften-btn-184"
                                onClick={() =>
                                  handleModerationAction(
                                    item.id,
                                    "soften_approve"
                                  )
                                }
                                className="bg-primary hover:bg-primary-container text-on-primary px-3.5 py-2 rounded font-ui-label-md text-ui-label-md font-medium shadow-sm flex items-center gap-1.5 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  edit_note
                                </span>
                                <span>온기 다듬기 및 승인</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleModerationAction(item.id, "raw_approve")
                                }
                                className="bg-surface-container-high hover:bg-surface-variant text-on-surface px-3 py-2 rounded font-ui-label-md text-ui-label-md font-medium transition-colors"
                              >
                                원문 그대로 승인
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleModerationAction(item.id, "reject")
                              }
                              className="text-tertiary hover:text-primary font-ui-label-md text-ui-label-md flex items-center gap-1 transition-colors px-2 py-1"
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                send_and_archive
                              </span>
                              <span>정중한 반려 및 위로 안내</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              data-testid="approve-mask-btn-182"
                              onClick={() =>
                                handleModerationAction(item.id, "mask_approve")
                              }
                              className="bg-primary hover:bg-primary-container text-on-primary px-3.5 py-2 rounded font-ui-label-md text-ui-label-md font-medium shadow-sm flex items-center gap-1.5 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                visibility_off
                              </span>
                              <span>연락처 자동 마스킹 후 발송 승인</span>
                            </button>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleModerationAction(item.id, "reject")
                                }
                                className="text-error hover:bg-error-container hover:text-on-error-container px-2.5 py-1.5 rounded font-ui-label-md text-ui-label-md transition-colors"
                              >
                                즉각 반려
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </article>
                ))
              )}

              {/* Visual Flow Graphic: Today's Warmth Route */}
              <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-sm border border-outline-variant/20">
                <div className="flex items-center justify-between">
                  <span className="font-ui-label-sm text-ui-label-sm uppercase tracking-wider text-tertiary">
                    오늘의 온기 순환 현황
                  </span>
                  <span className="font-caption text-caption text-tertiary">
                    24시간 단위 순환
                  </span>
                </div>
                <div className="w-full flex flex-col gap-2">
                  <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden flex">
                    <div
                      className="bg-primary h-full transition-all duration-500"
                      style={{ width: "78%" }}
                    />
                    <div
                      className="bg-secondary-container h-full transition-all duration-500"
                      style={{ width: "15%" }}
                    />
                    <div
                      className="bg-surface-container-highest h-full transition-all duration-500"
                      style={{ width: "7%" }}
                    />
                  </div>
                  <div className="flex items-center justify-between font-caption text-caption text-tertiary pt-1 flex-wrap gap-2">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                      승인 완료 ({approvedCount}통)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-secondary-container inline-block" />
                      검수 대기 ({pendingCount}건)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-surface-container-highest inline-block" />
                      반려/권고 ({rejectedCount}건)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Operations & Daily Curation (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-space-md">
            <div>
              <span className="font-ui-label-sm text-ui-label-sm text-secondary tracking-wider uppercase font-semibold">
                Operations &amp; Curation
              </span>
              <h2 className="font-headline-md text-headline-md text-on-surface font-medium">
                우체국 정기 운영 관리
              </h2>
              <p className="font-body-sm text-body-sm text-tertiary mt-0.5">
                편지함에 아침마다 깃드는 문학과 밤하늘 우편선의 운항 규약
              </p>
            </div>

            {/* Section A: Tomorrow's Curated Poem Card */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm relative flex flex-col gap-space-md overflow-hidden border border-outline-variant/25">
              <div className="flex items-center justify-between border-b border-surface-container-high pb-space-xs">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    menu_book
                  </span>
                  <span className="font-ui-label-md text-ui-label-md text-on-surface font-medium">
                    내일의 아침 시 큐레이션
                  </span>
                </div>
                <span className="font-ui-label-sm text-ui-label-sm px-2 py-0.5 rounded bg-surface-container-high text-tertiary">
                  D-1 내일 07:00
                </span>
              </div>

              {!isEditingPoem ? (
                <>
                  <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col gap-space-sm relative">
                    <div className="flex items-center justify-between">
                      <span className="font-title-md text-title-md text-on-surface font-medium">
                        {curatedPoem.title}
                      </span>
                      <span className="font-body-sm text-body-sm text-tertiary">
                        {curatedPoem.poet}
                      </span>
                    </div>
                    <div className="font-body-lg text-body-lg text-on-surface space-y-2 py-space-xs pl-2 border-l border-primary/20 leading-loose">
                      {curatedPoem.lines.map((line, idx) => (
                        <p
                          key={idx}
                          className={
                            idx === curatedPoem.lines.length - 1
                              ? "font-medium text-primary"
                              : ""
                          }
                        >
                          {line}
                        </p>
                      ))}
                    </div>
                    <div className="pt-space-xs border-t border-surface-container-high flex items-center justify-between text-tertiary font-caption text-caption">
                      <span className="italic">{curatedPoem.reason}</span>
                      <span className="material-symbols-outlined text-[16px] text-tertiary">
                        brush
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingPoem(true)}
                      className="bg-surface-container-high hover:bg-surface-variant text-on-surface px-3 py-2 rounded font-ui-label-md text-ui-label-md font-medium transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        swap_horiz
                      </span>
                      <span>시 교체하기</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingPoem(true)}
                      className="text-tertiary hover:text-primary font-ui-label-md text-ui-label-md px-2 py-1 transition-colors"
                    >
                      사유 문장 편집
                    </button>
                  </div>
                </>
              ) : (
                <form
                  onSubmit={handleSaveNewCuratedPoem}
                  className="flex flex-col gap-2.5"
                >
                  <input
                    type="text"
                    required
                    value={newPoemTitle}
                    onChange={(e) => setNewPoemTitle(e.target.value)}
                    placeholder="시 제목 (예: 가을 우체국 앞에서)"
                    className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-sm text-on-surface"
                  />
                  <input
                    type="text"
                    value={newPoemPoet}
                    onChange={(e) => setNewPoemPoet(e.target.value)}
                    placeholder="시인 이름 (예: 나태주 시인)"
                    className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-sm text-on-surface"
                  />
                  <textarea
                    required
                    rows={4}
                    value={newPoemBody}
                    onChange={(e) => setNewPoemBody(e.target.value)}
                    placeholder="시 구절을 입력해 주세요..."
                    className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-low p-3 text-sm text-on-surface"
                  />
                  <input
                    type="text"
                    value={newPoemReason}
                    onChange={(e) => setNewPoemReason(e.target.value)}
                    placeholder="큐레이터 사유 문장 (선정 이유)"
                    className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-xs text-on-surface"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingPoem(false)}
                      className="px-3 py-1.5 rounded bg-surface-container text-xs text-tertiary"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded bg-primary text-on-primary text-xs font-medium"
                    >
                      배정 저장
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Section B: Night Sky Post Control & Timing */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm border border-outline-variant/25">
              <div className="flex items-center justify-between border-b border-surface-container-high pb-space-xs">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-secondary text-[18px]">
                    bedtime
                  </span>
                  <span className="font-ui-label-md text-ui-label-md text-on-surface font-medium">
                    밤하늘 우체국 시간 제어
                  </span>
                </div>
                <span className="font-ui-label-sm text-ui-label-sm text-secondary bg-secondary-fixed px-2 py-0.5 rounded font-medium">
                  자정 시스템 연동
                </span>
              </div>

              <div className="flex flex-col gap-3 py-1">
                {/* Item 1: Night hours toggle */}
                <div className="flex items-center justify-between p-space-xs rounded-lg hover:bg-surface-container-low transition-colors">
                  <div className="flex flex-col">
                    <span className="font-body-sm text-body-sm text-on-surface font-medium">
                      심야 한정 개장 (21:00 — 04:00)
                    </span>
                    <span className="font-caption text-caption text-tertiary">
                      깊은 밤에만 부칠 수 있는 조용한 편지 창구
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      id="nightPostToggle"
                      type="checkbox"
                      checked={nightPostToggle}
                      onChange={(e) => {
                        setNightPostToggle(e.target.checked);
                        showToast(
                          e.target.checked
                            ? "심야 한정 개장(21:00~04:00) 규약이 활성화되었습니다."
                            : "심야 개장이 일시 잠금(주간 휴식 모드)으로 전환되었습니다."
                        );
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-container after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                  </label>
                </div>

                {/* Item 2: Midnight Dispatch Trigger */}
                <div className="flex items-center justify-between p-space-xs rounded-lg hover:bg-surface-container-low transition-colors">
                  <div className="flex flex-col">
                    <span className="font-body-sm text-body-sm text-on-surface font-medium">
                      자정 일괄 우편 배달 (24:00)
                    </span>
                    <span className="font-caption text-caption text-tertiary">
                      현재 142통의 궤도 편지가 조용히 대기 중
                    </span>
                  </div>
                  <span className="font-ui-label-sm text-ui-label-sm text-secondary bg-secondary-fixed/50 px-2 py-1 rounded">
                    정상 대기
                  </span>
                </div>

                {/* Item 3: Postman Sanctuary Mode */}
                <div className="flex items-center justify-between p-space-xs rounded-lg hover:bg-surface-container-low transition-colors">
                  <div className="flex flex-col">
                    <span className="font-body-sm text-body-sm text-on-surface font-medium">
                      우편선 점검 및 여백 보호 모드
                    </span>
                    <span className="font-caption text-caption text-tertiary">
                      신규 편지 일시 멈춤 및 정적 유지
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSanctuaryMaintenanceMode((p) => !p);
                      showToast(
                        !sanctuaryMaintenanceMode
                          ? "여백 보호 모드가 가동되었습니다."
                          : "여백 보호 모드가 해제되었습니다."
                      );
                    }}
                    className={`font-ui-label-sm text-ui-label-sm px-2.5 py-1 rounded transition-colors ${
                      sanctuaryMaintenanceMode
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container text-tertiary hover:text-on-surface"
                    }`}
                  >
                    {sanctuaryMaintenanceMode ? "가동 중" : "설정"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom Operational Log & Audit Stream */}
        <section className="mt-space-md bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm border border-outline-variant/25">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-container-high pb-space-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary text-[18px]">
                history_edu
              </span>
              <h3 className="font-title-md text-title-md text-on-surface font-medium">
                최근 우체국 관리 기록
              </h3>
            </div>
            <span className="font-caption text-caption text-tertiary">
              마지막 갱신: 방금 전
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md pt-2">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="font-body-sm text-body-sm text-on-surface font-medium">
                  180번째 온기 암호화 보관
                </span>
                <span className="font-caption text-caption text-tertiary mt-0.5">
                  20분 전 · 개인 식별 정보 영구 파기 및 익명화
                </span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-secondary mt-2 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="font-body-sm text-body-sm text-on-surface font-medium">
                  내일의 아침 시 등록 승인
                </span>
                <span className="font-caption text-caption text-tertiary mt-0.5">
                  1시간 전 · {curatedPoem.poet} ‘{curatedPoem.title}’ 조각 배정 완료
                </span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-tertiary-fixed-dim mt-2 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="font-body-sm text-body-sm text-on-surface font-medium">
                  우편선 심야 궤도 사전 동기화
                </span>
                <span className="font-caption text-caption text-tertiary mt-0.5">
                  3시간 전 · 야간 유영 대기 142통 정렬 완료
                </span>
              </div>
            </div>
          </div>
        </section>

        {adminToast && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-inverse-surface text-inverse-on-surface px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary-fixed text-[18px]">
              check_circle
            </span>
            <span>{adminToast}</span>
          </div>
        )}
      </div>
    </div>
  );
}
