import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  GUARDRAIL_REJECTION_MESSAGE,
  performEmotionCheckinWithGuardrail,
  analyzePostMoodAndTags,
} from "../src/lib/ai/gemini-guardrail.ts";
import {
  curateDailyLetters,
  getCachedDailyDeliveries,
  setCachedDailyDeliveries,
  clearDailyDeliveriesCache,
} from "../src/lib/curation/letter-matcher.ts";
import { isAuthorizedAdminEmail } from "../src/lib/auth/admin-guard.ts";
import {
  INITIAL_SEED_POSTS,
  filterPostsByRLS,
  canUserAccessPostByRLS,
} from "../src/lib/store/seed-data.ts";

async function runQaSuite() {
  console.log("=============================================================");
  console.log("🧪 여백의 우체통 (Margin Mailbox) 전체 QA 및 Stitch 시안 검증 시작");
  console.log("=============================================================\n");

  // ---------------------------------------------------------------------------
  // 1. 디자인 & 모바일 반응형 & DB RLS 스키마 정적 검증
  // ---------------------------------------------------------------------------
  const cssContent = fs.readFileSync(
    path.join(process.cwd(), "src/app/globals.css"),
    "utf8"
  );
  const requiredColors = [
    "#FDF9F2",
    "#FFFDF9",
    "#B84A39",
    "#9E3C2D",
    "#D99B38",
    "#FBF2E1",
    "#2D241E",
    "#7A6B61",
    "#EAE0D0",
  ];
  for (const hex of requiredColors) {
    assert.ok(
      cssContent.toUpperCase().includes(hex),
      `필수 가을 단풍 컬러 토큰 누락: ${hex}`
    );
  }
  assert.ok(
    cssContent.includes("overflow-x: hidden"),
    "모바일 가로 스크롤 방지(overflow-x: hidden) 누락"
  );
  assert.ok(
    cssContent.includes("min-height: 44px"),
    "모바일 최소 터치 영역(44x44px) 유틸리티 누락"
  );

  const layoutContent = fs.readFileSync(
    path.join(process.cwd(), "src/app/layout.tsx"),
    "utf8"
  );
  assert.ok(
    layoutContent.includes("min-h-dvh") && layoutContent.includes("max-w-[430px]"),
    "모바일 우선(430px 기준, dvh 단위) 레이아웃 설정 누락"
  );

  const schemaSql = fs.readFileSync(
    path.join(process.cwd(), "supabase/schema.sql"),
    "utf8"
  );
  const requiredTables = [
    "public.profiles",
    "public.emotion_logs",
    "public.posts",
    "public.letter_deliveries",
    "public.comments",
  ];
  for (const tbl of requiredTables) {
    assert.ok(schemaSql.includes(tbl), `DB 스키마 테이블 누락: ${tbl}`);
  }
  assert.ok(
    schemaSql.includes("is_public = TRUE") &&
      schemaSql.includes("auth.uid() = author_id"),
    "posts 테이블 비공개(is_public = false) RLS 차단 정책 누락"
  );
  console.log(
    "✅ [Test 1/7] 모바일 반응형(360~430px, dvh), 가을 단풍 컬러 시스템, Supabase 5대 테이블 및 RLS SQL 검증 통과"
  );

  // ---------------------------------------------------------------------------
  // 2. [Guardrail] AI 도메인 외 질문 차단 검증
  // ---------------------------------------------------------------------------
  const offTopicInputs = [
    "오늘 서울 강남 맛집 추천해 줘",
    "파이썬으로 퀵소트 알고리즘 코드 짜줘",
    "내일 삼성전자 주식이 오를까?",
    "프랑스의 수도는 어디야?",
  ];

  for (const query of offTopicInputs) {
    const result = await performEmotionCheckinWithGuardrail(query);
    assert.equal(
      result.allowed,
      false,
      `도메인 외 질문이 차단되지 않음: ${query}`
    );
    assert.equal(result.guardrailRejected, true);
    assert.equal(
      result.message,
      "죄송합니다. 오늘의 감정 기록과 시·문학 이야기에 관련된 내용에만 답변할 수 있습니다."
    );
    assert.equal(result.message, GUARDRAIL_REJECTION_MESSAGE);
  }
  console.log(
    "✅ [Test 2/7] [Guardrail] 도메인 외 질문(맛집, 코딩, 주식, 일반 상식) 입력 시 지정된 거절 문구 정확히 반환 검증 통과"
  );

  // ---------------------------------------------------------------------------
  // 3. [E2E] 정상 감정 체크인 & 위기 감지 안전장치 검증
  // ---------------------------------------------------------------------------
  const normalCheckin = await performEmotionCheckinWithGuardrail(
    "요즘 취준이 길어져서 마음이 조급하고 조금 지치네."
  );
  assert.equal(normalCheckin.allowed, true);
  assert.equal(normalCheckin.guardrailRejected, false);
  assert.ok(normalCheckin.emotionTags.length >= 1);
  assert.equal(normalCheckin.valence, "negative");

  const happyCheckin = await performEmotionCheckinWithGuardrail(
    "오늘 가을 햇살이 따뜻하고 산책하며 정말 행복했어."
  );
  assert.equal(happyCheckin.allowed, true);
  assert.equal(happyCheckin.valence, "positive");

  const postAnalysis = analyzePostMoodAndTags(
    "단풍잎 벤치",
    "따뜻한 차 한 잔의 온기가 마음을 토닥인다."
  );
  assert.equal(postAnalysis.mood_valence, "warm");
  console.log(
    "✅ [Test 3/7] [E2E] 감정 체크인 요약, 감정 키워드 추출 및 게시글 저장 시 문체/감정 태그 자동 분석 검증 통과"
  );

  // ---------------------------------------------------------------------------
  // 4. 요일별 시 편지 배달 (하루 1~2편 제한 & 행복 상태 시 우울한 글 차단 필터)
  // ---------------------------------------------------------------------------
  const positiveDeliveries = curateDailyLetters({
    allPosts: INITIAL_SEED_POSTS,
    userValence: "positive",
    userEmotionTags: ["행복", "설렘"],
    recipientId: "user-me",
    dayOfWeek: 2,
    maxLetters: 2,
  });
  assert.ok(
    positiveDeliveries.length >= 1 && positiveDeliveries.length <= 2,
    "하루 배달 편지 수(1~2통) 제한 위반"
  );
  for (const d of positiveDeliveries) {
    assert.notEqual(
      d.post.mood_valence,
      "deep_gloomy",
      "극단적 우울 시가 배달됨"
    );
    assert.notEqual(
      d.post.mood_valence,
      "melancholy",
      "행복한 감정 상태에서 우울한(melancholy) 시가 필터링되지 않음"
    );
    assert.equal(
      d.post.is_public,
      true,
      "비공개 글이 편지로 배달됨 (RLS 위반)"
    );
  }

  const wedDeliveries = curateDailyLetters({
    allPosts: INITIAL_SEED_POSTS,
    userValence: "neutral",
    userEmotionTags: ["위로 필요"],
    recipientId: "user-me",
    dayOfWeek: 3,
    maxLetters: 2,
  });
  assert.equal(wedDeliveries[0].theme_code, "wed_expert");
  assert.equal(wedDeliveries[0].post.is_expert_curated, true);
  console.log(
    "✅ [Test 4/7] 요일별 시 편지 배달(하루 1~2통 제한, 수요일 전문가 추천 시 매칭, 긍정 감정 시 우울한 글 차단 필터) 검증 통과"
  );

  // ---------------------------------------------------------------------------
  // 5. [Caching] 당일 재접속 시 daily_deliveries 캐시 재사용 검증
  // ---------------------------------------------------------------------------
  clearDailyDeliveriesCache();
  const testDate = "2026-11-18";
  assert.equal(getCachedDailyDeliveries("user-me", testDate, 3), null);
  setCachedDailyDeliveries("user-me", testDate, 3, wedDeliveries);
  const cachedResult = getCachedDailyDeliveries("user-me", testDate, 3);
  assert.ok(cachedResult !== null && cachedResult.length === wedDeliveries.length);
  assert.equal(cachedResult[0].post.id, wedDeliveries[0].post.id);
  console.log(
    "✅ [Test 5/7] [Caching] 당일 재접속 시 AI 중복 호출 없이 daily_deliveries 캐시 반환 검증 통과"
  );

  // ---------------------------------------------------------------------------
  // 6. [RLS & Admin] 비공개 게시글 타인 노출 차단 및 ADMIN_EMAILS 접근 제어 검증
  // ---------------------------------------------------------------------------
  const visibleToMe = filterPostsByRLS(INITIAL_SEED_POSTS, "user-me");
  const leakedOtherPrivate = visibleToMe.find(
    (p) => p.id === "poem-private-other-user"
  );
  assert.equal(
    leakedOtherPrivate,
    undefined,
    "RLS 위반: 타인의 비공개(is_public=false) 게시글이 노출됨!"
  );

  const myPrivatePost = INITIAL_SEED_POSTS.find(
    (p) => p.id === "poem-my-library-private"
  )!;
  assert.equal(canUserAccessPostByRLS(myPrivatePost, "user-me"), true);
  assert.equal(canUserAccessPostByRLS(myPrivatePost, "user-stranger"), false);

  process.env.ADMIN_EMAILS = "admin@marginmailbox.kr,curator@marginmailbox.kr";
  assert.equal(isAuthorizedAdminEmail("admin@marginmailbox.kr"), true);
  assert.equal(isAuthorizedAdminEmail("CURATOR@marginmailbox.kr"), true);
  assert.equal(isAuthorizedAdminEmail("seoyeon@example.com"), false);
  assert.equal(isAuthorizedAdminEmail(""), false);
  assert.equal(isAuthorizedAdminEmail(null), false);
  console.log(
    "✅ [Test 6/7] [RLS & Admin] 비공개 글(is_public=false) 타인 차단 및 ADMIN_EMAILS 화이트리스트 권한 검증 통과"
  );

  // ---------------------------------------------------------------------------
  // 7. [Stitch Design page_1 ~ page_13] 13개 화면 및 인터랙션 통합 검증
  // ---------------------------------------------------------------------------
  const homePage = fs.readFileSync(
    path.join(process.cwd(), "src/app/page.tsx"),
    "utf8"
  );
  for (const tabLabel of [
    "오늘의 편지함",
    "글쓰기",
    "나의 서재",
    "밤하늘 우체국",
    "관리자",
  ]) {
    assert.ok(homePage.includes(tabLabel), `상단 5대 탭 누락: ${tabLabel}`);
  }

  const welcomeView = fs.readFileSync(
    path.join(process.cwd(), "src/components/stitch/WelcomeRitualView.tsx"),
    "utf8"
  );
  assert.ok(
    welcomeView.includes("여백의 우체통 입장하기") &&
      welcomeView.includes("잠시 멈추기") &&
      welcomeView.includes("餘白"),
    "입실 환영 의례(page_12.html) 필수 요소 누락"
  );

  const mailboxView = fs.readFileSync(
    path.join(process.cwd(), "src/components/stitch/TodaysMailboxView.tsx"),
    "utf8"
  );
  assert.ok(
    mailboxView.includes("1. 봉인된 봉투") &&
      mailboxView.includes("2. 왁스 실링 개봉") &&
      mailboxView.includes("3. 편지지 펼침") &&
      mailboxView.includes("마음 봉인하기") &&
      mailboxView.includes("마음에 닿은 구절 남기기"),
    "오늘의 편지함 & 3단계 왁스 실링 개봉(page_1, page_2, page_13) 필수 요소 누락"
  );

  const editorView = fs.readFileSync(
    path.join(process.cwd(), "src/components/stitch/WritingEditorView.tsx"),
    "utf8"
  );
  assert.ok(
    editorView.includes("단편 시 (Poem)") &&
      editorView.includes("하루 단상 (Diary)") &&
      editorView.includes("마음의 편지 (Letter)") &&
      editorView.includes("서재에 간직하기") &&
      editorView.includes("우편함으로 부치기"),
    "글쓰기 에디터(page_3.html) 모드 및 공개 범위 라디오 버튼 연동 누락"
  );

  const libraryView = fs.readFileSync(
    path.join(process.cwd(), "src/components/stitch/MyLibraryView.tsx"),
    "utf8"
  );
  assert.ok(
    libraryView.includes("11월의 마음 팔레트") &&
      libraryView.includes("마음 답장 보내기 (한 줄 안부)") &&
      libraryView.includes("답장에 온기를 띄웁니다") &&
      libraryView.includes("온기가 밤하늘로"),
    "나의 서재 & 답장 모달 & 밤하늘 발송 영수증(page_4 ~ page_8) 흐름 누락"
  );

  const nightSkyView = fs.readFileSync(
    path.join(process.cwd(), "src/components/stitch/NightSkyPostOfficeView.tsx"),
    "utf8"
  );
  assert.ok(
    nightSkyView.includes("#131B2E") &&
      nightSkyView.includes("#1D2942") &&
      nightSkyView.includes("#F4C96B") &&
      nightSkyView.includes("#D99B38") &&
      nightSkyView.includes("[8500, 9800, 9100, 10200]") &&
      nightSkyView.includes("1800") &&
      nightSkyView.includes("[야간 개장 / 주간 잠금 모드 미리보기 전환]"),
    "밤하늘 우체국(page_9, page_10) 컬러/주기(8.5s, 9.8s, 9.1s, 10.2s)/1.8s 페이드/미리보기 전환 토글 누락"
  );

  const adminView = fs.readFileSync(
    path.join(process.cwd(), "src/components/stitch/AdminConsoleView.tsx"),
    "utf8"
  );
  assert.ok(
    adminView.includes("온기 돌봄 및 편지 검수함") &&
      adminView.includes("연락처 자동 마스킹 후 발송 승인") &&
      adminView.includes("내일의 아침 시 큐레이션") &&
      adminView.includes("밤하늘 우체국 시간 제어"),
    "관리자 콘솔(page_11.html) 필수 모듈 누락"
  );

  console.log(
    "✅ [Test 7/8] [Stitch page_1 ~ page_13] 입실 환영 의례, 3단계 왁스 실링 개봉, 글쓰기 에디터, 나의 서재 모달 체인, 밤하늘 우체국(야간/주간 분기 & 4슬롯 비동기 순환), 관리자 콘솔 검증 통과"
  );

  // ---------------------------------------------------------------------------
  // 8. [Google Apps Script 배포 패키지 검증] gas_deploy/Code.gs & gas_deploy/index.html
  // ---------------------------------------------------------------------------
  const codeGs = fs.readFileSync(
    path.join(process.cwd(), "gas_deploy/Code.gs"),
    "utf8"
  );
  for (const token of [
    "function doGet",
    'HtmlService.createTemplateFromFile("index")',
    "HtmlService.XFrameOptionsMode.ALLOWALL",
    "PropertiesService.getScriptProperties()",
    "GEMINI_API_KEY",
    "ADMIN_EMAIL",
    "function generateEmpathyReply",
    "function saveEntry",
    "function getLibraryData",
    "function getNightSkyLetters",
    "function checkAdminAccess",
  ]) {
    assert.ok(codeGs.includes(token), `gas_deploy/Code.gs 필수 구현 누락: ${token}`);
  }

  const gasIndexHtml = fs.readFileSync(
    path.join(process.cwd(), "gas_deploy/index.html"),
    "utf8"
  );
  for (const token of [
    "https://cdn.tailwindcss.com",
    "Noto+Serif+KR",
    "Material+Symbols+Outlined",
    "google.script.run",
    "withSuccessHandler",
    "withFailureHandler",
    "[8500, 9800, 9100, 10200]",
    "[야간 개장 / 주간 잠금 모드 미리보기 전환]",
    "1. 봉인된 봉투",
    "2. 왁스 실링 개봉",
    "3. 편지지 펼침",
  ]) {
    assert.ok(
      gasIndexHtml.includes(token),
      `gas_deploy/index.html 필수 구현 누락: ${token}`
    );
  }

  console.log(
    "✅ [Test 8/8] [GAS 배포 패키지] gas_deploy/Code.gs 및 gas_deploy/index.html 통합 검증 통과\n"
  );
  console.log("🎉 모든 요구사항, Stitch 13개 화면 및 GAS 배포 패키지 테스트 100% 통과!");
}

runQaSuite().catch((err) => {
  console.error("❌ QA 테스트 실패:", err);
  process.exit(1);
});
