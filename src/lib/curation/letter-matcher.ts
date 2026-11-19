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

/**
 * 요일별 시 편지 배달 테마 정의 (월~일)
 */
export function getDayThemeMeta(dayOfWeek: number): DayThemeMeta {
  switch (dayOfWeek) {
    case 1:
      return {
        dayOfWeek: 1,
        dayNameKo: "월요일",
        themeCode: "mon_similar",
        themeLabel: "마음의 결이 닮은 시 편지",
        description:
          "오늘 당신이 남긴 감정 키워드와 문체의 결이 닮아 있는 이웃의 시 편지입니다.",
      };
    case 2:
      return {
        dayOfWeek: 2,
        dayNameKo: "화요일",
        themeCode: "tue_random",
        themeLabel: "우연이 건네는 운명적 시 편지",
        description:
          "감정 보호 필터를 거쳐 오늘 당신에게 우연처럼 찾아온 따뜻한 시 편지입니다.",
      };
    case 3:
      return {
        dayOfWeek: 3,
        dayNameKo: "수요일",
        themeCode: "wed_expert",
        themeLabel: "수요일의 문학 전문가 추천 시",
        description:
          "문학 전문가와 운영진이 깊이 있는 해설과 함께 엄선한 수요일의 시 편지입니다.",
      };
    case 4:
      return {
        dayOfWeek: 4,
        dayNameKo: "목요일",
        themeCode: "thu_amateur",
        themeLabel: "아마추어 창작자의 새로운 시선",
        description:
          "여백의 우체통에서 꾸준히 마음을 기록하는 아마추어 시인의 신작 편지입니다.",
      };
    case 5:
    case 6:
    case 0:
    default:
      return {
        dayOfWeek,
        dayNameKo:
          dayOfWeek === 5 ? "금요일" : dayOfWeek === 6 ? "토요일" : "일요일",
        themeCode: "fri_sun_weekly_comfort",
        themeLabel: "주간 결산과 다정한 위로의 시 편지",
        description:
          "한 주를 건너온 당신의 어깨를 토닥이는 다정한 위로와 희망의 구절들을 모았습니다.",
      };
  }
}

/**
 * 감정 보호 필터 (Emotion Protection Filter)
 * - 비공개(is_public === false) 글은 타인의 우편함에 절대 배달되지 않음 (RLS 원칙 준수)
 * - 지나치게 어두운 우울(deep_gloomy) 톤의 글은 타인 정서 보호를 위해 배달 풀에서 제외
 * - 특히 사용자가 긍정적/행복한 감정 상태(valence === 'positive')일 때는
 *   우울한 톤(deep_gloomy, melancholy)의 시를 모두 제외하여 기분을 해치지 않도록 보호
 */
export function applyEmotionProtectionFilter(
  candidates: PoemPost[],
  userValence: EmotionValence,
  recipientUserId?: string
): PoemPost[] {
  return candidates.filter((post) => {
    // 1. 비공개 글은 절대 타인에게 배달 불가
    if (!post.is_public) return false;

    // 2. 본인 글은 타인 편지 배달에서 제외 (단, 후보 풀이 부족할 경우를 위해 옵션 처리)
    if (recipientUserId && post.author_id === recipientUserId) return false;

    // 3. 극단적 우울(deep_gloomy) 글은 감정 전이 방지를 위해 항상 배달 제외
    if (post.mood_valence === "deep_gloomy") return false;

    // 4. 사용자가 긍정/행복 상태일 때 우울/슬픔(melancholy) 톤의 글까지 차단
    if (userValence === "positive" && post.mood_valence === "melancholy") {
      return false;
    }

    return true;
  });
}

/**
 * 요일별 테마 및 현재 감정에 맞춰 하루 1~2편의 시 편지를 큐레이션합니다.
 */
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

  // 하루 최대 1~2통 제한 강제
  const limit = Math.min(2, Math.max(1, maxLetters));
  const themeMeta = getDayThemeMeta(dayOfWeek);

  // 1단계: 감정 보호 필터 및 공개 여부 필터 적용
  const safePool = applyEmotionProtectionFilter(
    allPosts,
    userValence,
    recipientId
  );

  let prioritized: PoemPost[] = [];

  if (themeMeta.themeCode === "wed_expert") {
    // 수요일: 문학 전문가 추천 시 우선
    const expertPicks = safePool.filter(
      (p) => p.is_expert_curated || p.category === "expert_pick"
    );
    const others = safePool.filter(
      (p) => !p.is_expert_curated && p.category !== "expert_pick"
    );
    prioritized = [...expertPicks, ...others];
  } else if (themeMeta.themeCode === "thu_amateur") {
    // 목요일: 아마추어 창작자 신작 (전문가 추천이 아닌 일반 창작 시 최신순)
    const amateurPoems = safePool
      .filter((p) => !p.is_expert_curated && p.category !== "expert_pick")
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    const fallback = safePool.filter((p) => p.is_expert_curated);
    prioritized = [...amateurPoems, ...fallback];
  } else if (themeMeta.themeCode === "mon_similar") {
    // 월요일: 감정 키워드 및 결 유사도 순 정렬
    prioritized = [...safePool].sort((a, b) => {
      const scoreA = a.emotion_tags.filter((t) =>
        userEmotionTags.some((ut) => ut.includes(t) || t.includes(ut))
      ).length;
      const scoreB = b.emotion_tags.filter((t) =>
        userEmotionTags.some((ut) => ut.includes(t) || t.includes(ut))
      ).length;
      return scoreB - scoreA;
    });
  } else if (themeMeta.themeCode === "fri_sun_weekly_comfort") {
    // 금~일요일: 따뜻한 위로(warm, bright, calm) 우선
    prioritized = [...safePool].sort((a, b) => {
      const weight = (v: PoemPost["mood_valence"]) =>
        v === "warm" ? 3 : v === "bright" ? 2 : v === "calm" ? 1 : 0;
      return weight(b.mood_valence) - weight(a.mood_valence);
    });
  } else {
    // 화요일: 감정 보호 필터를 통과한 안전한 후보군 중 날짜 시드 기반 결정론적 매칭
    const seed = deliveryDate
      .split("")
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    prioritized = [...safePool].sort((a, b) => {
      const hashA = (a.id.charCodeAt(0) + seed) % 17;
      const hashB = (b.id.charCodeAt(0) + seed) % 17;
      return hashA - hashB;
    });
  }

  const selected = prioritized.slice(0, limit);

  return selected.map((post, idx) => ({
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

/**
 * 당일 재접속 시 불필요한 AI 재호출 방지를 위한 daily_deliveries 캐시 저장소
 * Key: `${userId}:${date}:${dayOfWeek}`
 */
const dailyDeliveriesCache = new Map<
  string,
  {
    deliveries: LetterDelivery[];
    cachedAt: string;
  }
>();

export function getCachedDailyDeliveries(
  userId: string,
  deliveryDate: string,
  dayOfWeek: number
): LetterDelivery[] | null {
  const key = `${userId}:${deliveryDate}:${dayOfWeek}`;
  const entry = dailyDeliveriesCache.get(key);
  return entry ? entry.deliveries : null;
}

export function setCachedDailyDeliveries(
  userId: string,
  deliveryDate: string,
  dayOfWeek: number,
  deliveries: LetterDelivery[]
): void {
  const key = `${userId}:${deliveryDate}:${dayOfWeek}`;
  dailyDeliveriesCache.set(key, {
    deliveries,
    cachedAt: new Date().toISOString(),
  });
}

export function clearDailyDeliveriesCache(): void {
  dailyDeliveriesCache.clear();
}

