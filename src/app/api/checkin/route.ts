import { NextResponse } from "next/server";
import { performEmotionCheckinWithGuardrail } from "@/lib/ai/gemini-guardrail";
import {
  curateDailyLetters,
  getCachedDailyDeliveries,
  setCachedDailyDeliveries,
} from "@/lib/curation/letter-matcher";
import { INITIAL_SEED_POSTS } from "@/lib/store/seed-data";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const dayOfWeek =
      typeof body?.dayOfWeek === "number"
        ? body.dayOfWeek
        : new Date().getDay();
    const userId =
      typeof body?.userId === "string" && body.userId
        ? body.userId
        : "user-me";
    const useCache = body?.useCache === true;

    if (!text) {
      return NextResponse.json(
        { error: "오늘의 감정이나 하루 이야기를 입력해 주세요." },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().slice(0, 10);

    // 당일 캐시 조회 옵션이 켜져 있고 이미 배달된 편지가 있는 경우 캐시 반환
    if (useCache) {
      const cached = getCachedDailyDeliveries(userId, today, dayOfWeek);
      if (cached) {
        return NextResponse.json({
          checkin: {
            allowed: true,
            guardrailRejected: false,
            message: "오늘 이미 배달된 시 편지함을 불러왔습니다.",
            emotionTags: ["일일 캐시"],
            valence: "neutral",
            intensity: 3,
            checkinDate: today,
          },
          deliveries: cached,
          cached: true,
        });
      }
    }

    const checkin = await performEmotionCheckinWithGuardrail(text);

    // 도메인 외 질문으로 가드레일에 의해 차단된 경우 편지 매칭을 수행하지 않고 즉시 안내 문구 반환
    if (!checkin.allowed || checkin.guardrailRejected) {
      return NextResponse.json({
        checkin,
        deliveries: [],
        cached: false,
      });
    }

    // 정상 감정 체크인인 경우 요일별 테마 + 감정 보호 필터를 거쳐 1~2통의 시 편지 배달
    const deliveries = curateDailyLetters({
      allPosts: INITIAL_SEED_POSTS,
      userValence: checkin.valence,
      userEmotionTags: checkin.emotionTags,
      recipientId: userId,
      dayOfWeek,
      deliveryDate: today,
      maxLetters: 2,
    });

    // 당일 배달 내역 캐싱 (daily_deliveries)
    setCachedDailyDeliveries(userId, today, dayOfWeek, deliveries);

    return NextResponse.json({
      checkin,
      deliveries,
      cached: false,
    });
  } catch {
    return NextResponse.json(
      { error: "감정 체크인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
