import type {
  DayThemeCode,
  EmotionValence,
  LetterDelivery,
  PoemPost,
} from "../types/domain.ts";

export interface DayThemeMeta {
  dayOfWeek: number;
  dayNameKo: string;
  themeCode: DayThemeCode;
  themeLabel: string;
  description: string;
}

export function getDayThemeMeta(dayOfWeek: number): DayThemeMeta {
  switch (dayOfWeek) {
    case 1:
      return {
        dayOfWeek: 1,
        dayNameKo: "월요일",
        themeCode: "mon_similar",
        themeLabel: "마음의 결이 닮은 시 편지",
        description: "오늘 당신이 남긴 감정 키워드와 문체의 결이 닮아 있는 이웃의 시 편지입니다.",
      };
    case 2:
      return {
        dayOfWeek: 2,
        dayNameKo: "화요일",
        themeCode: "tue_random",
        themeLabel: "우연이 건네는 운명적 시 편지",
        description: "감정 보호 필터를 거쳐 오늘 당신에게 우연처럼 찾아온 따뜻한 시 편지입니다.",
      };
    case 3:
      return {
        dayOfWeek: 3,
        dayNameKo: "수요일",
        themeCode: "wed_expert",
        themeLabel: "수요일의 문학 전문가 추천 시",
        description: "문학 전문가와 운영진이 깊이 있는 해설과 함께 엄선한 수요일의 시 편지입니다.",
      };
    case 4:
      return {
        dayOfWeek: 4,
        dayNameKo: "목요일",
        themeCode: "thu_amateur",
        themeLabel: "아마추어 창작자의 새로운 시선",
        description: "여백의 우체통에서 꾸준히 마음을 기록하는 아마추어 시인의 신작 편지입니다.",
      };
    default:
      return {
        dayOfWeek,
        dayNameKo: dayOfWeek === 5 ? "금요일" : dayOfWeek === 6 ? "토요일" : "일요일",
        themeCode: "fri_sun_weekly_comfort",
        themeLabel: "주간 결산과 다정한 위로의 시 편지",
        description: "한 주를 건너온 당신의 어깨를 토닥이는 다정한 위로와 희망의 구절들을 모았습니다.",
      };
  }
}

export function applyEmotionProtectionFilter(
  candidates: PoemPost[],
  userValence: EmotionValence,
  recipientUserId?: string
): PoemPost[] {
  return candidates.filter((post) => {
    if (!post.is_public) return false;
    if (recipientUserId && post.author_id === recipientUserId) return false;
    if (post.mood_valence === "deep_gloomy") return false;
    if (userValence === "positive" && post.mood_valence === "melancholy") return false;
    return true;
  });
}

export function curateDailyLetters(params: {
  allPosts: PoemPost[];
  userValence: EmotionValence;
  userEmotionTags: string[];
  recipientId: string;
  dayOfWeek?: number;
  deliveryDate?: string;
  maxLetters?: number;
}): LetterDelivery[] {
  const {
    allPosts,
    userValence,
    userEmotionTags,
    recipientId,
    dayOfWeek = new Date().getDay(),
    deliveryDate = new Date().toISOString().slice(0, 10),
    maxLetters = 2,
  } = params;

  const limit = Math.min(2, Math.max(1, maxLetters));
  const themeMeta = getDayThemeMeta(dayOfWeek);
  const safePool = applyEmotionProtectionFilter(allPosts, userValence, recipientId);

  let prioritized: PoemPost[] = [];
  if (themeMeta.themeCode === "wed_expert") {
    prioritized = [
      ...safePool.filter((p) => p.is_expert_curated || p.category === "expert_pick"),
      ...safePool.filter((p) => !p.is_expert_curated && p.category !== "expert_pick"),
    ];
  } else if (themeMeta.themeCode === "mon_similar") {
    prioritized = [...safePool].sort((a, b) => {
      const scoreA = a.emotion_tags.filter((t) => userEmotionTags.includes(t)).length;
      const scoreB = b.emotion_tags.filter((t) => userEmotionTags.includes(t)).length;
      return scoreB - scoreA;
    });
  } else {
    prioritized = [...safePool];
  }

  return prioritized.slice(0, limit).map((post, idx) => ({
    id: `delivery-${deliveryDate}-${dayOfWeek}-${idx + 1}`,
    recipient_id: recipientId,
    post_id: post.id,
    delivery_date: deliveryDate,
    day_of_week: dayOfWeek,
    theme_code: themeMeta.themeCode,
    theme_label: `${themeMeta.dayNameKo} · ${themeMeta.themeLabel}`,
    curation_note: themeMeta.description,
    is_read: false,
    post,
  }));
}

const dailyDeliveriesCache = new Map<string, { deliveries: LetterDelivery[]; cachedAt: string }>();

export function getCachedDailyDeliveries(userId: string, deliveryDate: string, dayOfWeek: number): LetterDelivery[] | null {
  const entry = dailyDeliveriesCache.get(`${userId}:${deliveryDate}:${dayOfWeek}`);
  return entry ? entry.deliveries : null;
}

export function setCachedDailyDeliveries(userId: string, deliveryDate: string, dayOfWeek: number, deliveries: LetterDelivery[]): void {
  dailyDeliveriesCache.set(`${userId}:${deliveryDate}:${dayOfWeek}`, {
    deliveries,
    cachedAt: new Date().toISOString(),
  });
}

export function clearDailyDeliveriesCache(): void {
  dailyDeliveriesCache.clear();
}
