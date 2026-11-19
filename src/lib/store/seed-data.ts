import type { EmpathyComment, PoemPost } from "../types/domain.ts";

export const INITIAL_SEED_POSTS: PoemPost[] = [
  {
    id: "poem-expert-wed-1",
    author_id: "user-admin-curator",
    author_pen_name: "문학 큐레이터 서윤",
    title: "젖은 우산을 접는 저녁",
    content: `현관 앞에 기대어 둔 우산 끝에서\n하루치의 빗방울이 천천히 몸을 놓는다.\n괜찮다, 오늘도 무사히 접혔으니\n내일 아침엔 마른 바람이 불어올 것이다.`,
    category: "expert_pick",
    emotion_tags: ["위로 필요", "지침", "평온", "조급함"],
    mood_valence: "warm",
    is_public: true,
    is_expert_curated: true,
    original_poet: "한서윤 시인",
    expert_commentary: "퇴근길이나 긴 하루 끝에 마음이 조급하고 지친 분들에게 건네는 수요일 전문가 추천 시입니다.",
    created_at: "2026-11-11T21:00:00.000Z",
  },
  {
    id: "poem-expert-wed-2",
    author_id: "user-admin-curator",
    author_pen_name: "문학 큐레이터 서윤",
    title: "은행잎이 건네는 안부",
    content: `노란 빛깔은 서둘러 오지 않는다\n수많은 바람과 서늘한 새벽을 견딘 뒤에야\n비로소 가장 따뜻한 색으로 물든다.`,
    category: "expert_pick",
    emotion_tags: ["희망", "설렘", "행복", "따스함"],
    mood_valence: "bright",
    is_public: true,
    is_expert_curated: true,
    original_poet: "이도훈 시인",
    expert_commentary: "기다림의 시간을 지나고 있는 이들에게 가을 은행잎의 온기를 전하는 전문가 큐레이션 작품입니다.",
    created_at: "2026-11-12T20:30:00.000Z",
  },
  {
    id: "poem-melancholy-rain",
    author_id: "user-rain",
    author_pen_name: "새벽안개",
    title: "비 개인 뒤의 긴 그림자",
    content: `창유리에 남은 빗물 자국을 따라\n오래전 지나간 계절의 이름을 불러 본다.`,
    category: "poem",
    emotion_tags: ["외로움", "그리움", "우울감"],
    mood_valence: "melancholy",
    is_public: true,
    is_expert_curated: false,
    created_at: "2026-11-14T23:00:00.000Z",
  },
  {
    id: "poem-deep-gloomy-filtered",
    author_id: "user-shadow",
    author_pen_name: "심연의 기록",
    title: "끝없는 어둠 속의 침묵",
    content: `아무런 빛도 닿지 않는 무너진 밤, 절망의 무게가 숨을 짓누르는 시간.`,
    category: "diary",
    emotion_tags: ["깊은 밤", "절망"],
    mood_valence: "deep_gloomy",
    is_public: true,
    is_expert_curated: false,
    created_at: "2026-11-13T02:00:00.000Z",
  },
  {
    id: "poem-private-other-user",
    author_id: "user-other-secret",
    author_pen_name: "익명의 기록자",
    title: "[비공개] 누구에게도 보이기 싫은 비밀 일기",
    content: `이 글은 is_public = false 로 저장된 타인의 비공개 일기입니다.`,
    category: "diary",
    emotion_tags: ["비공개", "내면"],
    mood_valence: "melancholy",
    is_public: false,
    is_expert_curated: false,
    created_at: "2026-11-17T23:40:00.000Z",
  },
  {
    id: "poem-my-library-private",
    author_id: "user-me",
    author_pen_name: "달무리 서재",
    title: "혼자만 간직하는 밤의 단상",
    content: `남들에게 보여주기 부끄러운 솔직한 속마음을 나만 보기(비공개)로 조용히 적어 둔다.`,
    category: "diary",
    emotion_tags: ["조급함", "지침"],
    mood_valence: "melancholy",
    is_public: false,
    is_expert_curated: false,
    created_at: "2026-11-17T22:50:00.000Z",
  },
];

export const INITIAL_SEED_COMMENTS: EmpathyComment[] = [
  {
    id: "comment-seed-1",
    post_id: "poem-expert-wed-1",
    author_id: "user-seoyeon",
    author_pen_name: "밤산책자 서연",
    quoted_line: "괜찮다, 오늘도 무사히 접혔으니 내일 아침엔 마른 바람이 불어올 것이다.",
    content: "젖은 우산을 접는 소리라는 표현이 오늘 퇴근길 제 마음 같아서 큰 위로가 되었습니다.",
    created_at: "2026-11-17T21:15:00.000Z",
  },
];

export function filterPostsByRLS(posts: PoemPost[], viewerUserId: string | null): PoemPost[] {
  return posts.filter((post) => post.is_public === true || post.author_id === viewerUserId);
}

export function canUserAccessPostByRLS(post: PoemPost, viewerUserId: string | null): boolean {
  return post.is_public === true || post.author_id === viewerUserId;
}
