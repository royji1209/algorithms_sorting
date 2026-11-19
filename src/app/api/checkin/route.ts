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
    const dayOfWeek = typeof body?.dayOfWeek === "number" ? body.dayOfWeek : new Date().getDay();
    const userId = typeof body?.userId === "string" && body.userId ? body.userId : "user-me";
    const useCache = body?.useCache === true;

    if (!text) {
      return NextResponse.json({ error: "오늘의 감정이나 하루 이야기를 입력해 주세요." }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);

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
    if (!checkin.allowed || checkin.guardrailRejected) {
      return NextResponse.json({ checkin, deliveries: [], cached: false });
    }

    const deliveries = curateDailyLetters({
      allPosts: INITIAL_SEED_POSTS,
      userValence: checkin.valence,
      userEmotionTags: checkin.emotionTags,
      recipientId: userId,
      dayOfWeek,
      deliveryDate: today,
      maxLetters: 2,
    });

    setCachedDailyDeliveries(userId, today, dayOfWeek, deliveries);
    return NextResponse.json({ checkin, deliveries, cached: false });
  } catch {
    return NextResponse.json({ error: "감정 체크인 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
