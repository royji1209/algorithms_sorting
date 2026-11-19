import type { EmpathyComment, PoemPost } from "../types/domain.ts";

/**
 * 초기 시드 데이터 및 로컬/서버 상태 저장소
 * - 비공개(is_public: false) 글 RLS 필터링 검증용 데이터 포함
 * - 감정 보호 필터 검증용(deep_gloomy, melancholy, warm, bright) 데이터 포함
 * - 수요일 전문가 추천 시(is_expert_curated: true) 데이터 포함
 */
export const INITIAL_SEED_POSTS: PoemPost[] = [
  {
    id: "poem-expert-wed-1",
    author_id: "user-admin-curator",
    author_pen_name: "문학 큐레이터 서윤",
    title: "젖은 우산을 접는 저녁",
    content: `현관 앞에 기대어 둔 우산 끝에서
하루치의 빗방울이 천천히 몸을 놓는다.

급하게 건너온 횡단보도와
미처 삼키지 못한 말들이
마루 바닥에 작은 물자국으로 고일 때,

괜찮다, 오늘도 무사히 접혔으니
내일 아침엔 마른 바람이 불어올 것이다.`,
    category: "expert_pick",
    emotion_tags: ["위로 필요", "지침", "평온", "조급함"],
    mood_valence: "warm",
    is_public: true,
    is_expert_curated: true,
    original_poet: "한서윤 시인",
    expert_commentary:
      "퇴근길이나 긴 하루 끝에 마음이 조급하고 지친 분들에게 건네는 수요일 전문가 추천 시입니다. '젖은 우산을 접는 소리'처럼 오늘의 무게를 조용히 내려놓으시길 바랍니다.",
    created_at: "2026-11-11T21:00:00.000Z",
  },
  {
    id: "poem-expert-wed-2",
    author_id: "user-admin-curator",
    author_pen_name: "문학 큐레이터 서윤",
    title: "은행잎이 건네는 안부",
    content: `노란 빛깔은 서둘러 오지 않는다
수많은 바람과 서늘한 새벽을 견딘 뒤에야
비로소 가장 따뜻한 색으로 물든다.

네가 아직 피어나지 못한 것이 아니라
가장 깊은 빛을 준비하고 있는 계절일 뿐이다.`,
    category: "expert_pick",
    emotion_tags: ["희망", "설렘", "행복", "따스함"],
    mood_valence: "bright",
    is_public: true,
    is_expert_curated: true,
    original_poet: "이도훈 시인",
    expert_commentary:
      "기다림의 시간을 지나고 있는 이들에게 가을 은행잎의 온기를 전하는 전문가 큐레이션 작품입니다.",
    created_at: "2026-11-12T20:30:00.000Z",
  },
  {
    id: "poem-amateur-thu-1",
    author_id: "user-dohyun",
    author_pen_name: "단풍나무 우체부 (도현)",
    title: "도서관 창가의 오후 네 시",
    content: `책장 넘기는 소리 사이로
기울어진 가을 햇살이 연필 끝에 머문다.

아직 쓰지 못한 문장들이 많아서
오히려 내일이 조금은 기다려지는 오후,
따뜻한 보리차 한 모금에 마음이 놓인다.`,
    category: "poem",
    emotion_tags: ["평온", "일상 기록", "설렘", "여백"],
    mood_valence: "calm",
    is_public: true,
    is_expert_curated: false,
    created_at: "2026-11-15T16:00:00.000Z",
  },
  {
    id: "poem-amateur-thu-2",
    author_id: "user-seoyeon",
    author_pen_name: "밤산책자 서연",
    title: "가로등 아래의 작은 숨",
    content: `버스에서 내려 집으로 걷는 골목길
주머니 속 손끝이 조금 시려울 때쯤
창문마다 켜진 주황빛 등불을 세어 본다.

누군가의 하루도 저 불빛 안에서
조용히 쉬어가고 있겠지.`,
    category: "poem",
    emotion_tags: ["위로 필요", "지침", "온기", "차분함"],
    mood_valence: "warm",
    is_public: true,
    is_expert_curated: false,
    created_at: "2026-11-16T22:10:00.000Z",
  },
  {
    id: "poem-melancholy-rain",
    author_id: "user-rain",
    author_pen_name: "새벽안개",
    title: "비 개인 뒤의 긴 그림자",
    content: `창유리에 남은 빗물 자국을 따라
오래전 지나간 계절의 이름을 불러 본다.
조금 쓸쓸하지만 울지 않아도 되는 밤이다.`,
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
    content: `아무런 빛도 닿지 않는 무너진 밤,
절망의 무게가 숨을 짓누르는 시간.`,
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
    content: `이 글은 is_public = false 로 저장된 타인의 비공개 일기입니다.
RLS 정책에 의해 작성자 본인 외에는 절대 조회하거나 편지로 배달될 수 없습니다.`,
    category: "diary",
    emotion_tags: ["비공개", "내면"],
    mood_valence: "melancholy",
    is_public: false,
    is_expert_curated: false,
    created_at: "2026-11-17T23:40:00.000Z",
  },
  {
    id: "poem-my-library-1",
    author_id: "user-me",
    author_pen_name: "가을산책자",
    title: "낙엽 밟는 소리를 모으는 저녁",
    content: `바스락거리는 소리가 좋아서
일부러 은행나무가 많은 길로 돌아서 왔다.
오늘 하루의 작은 실수들도
낙엽 아래 조용히 덮어 두기로 했다.`,
    category: "poem",
    emotion_tags: ["평온", "따스함", "일상 기록"],
    mood_valence: "warm",
    is_public: true,
    is_expert_curated: false,
    created_at: "2026-11-16T21:20:00.000Z",
  },
  {
    id: "poem-my-library-private",
    author_id: "user-me",
    author_pen_name: "가을산책자",
    title: "혼자만 간직하는 밤의 단상",
    content: `유난히 마음이 조급했던 날.
남들에게 보여주기 부끄러운 솔직한 속마음을
나만 보기(비공개)로 조용히 적어 둔다.`,
    category: "diary",
    emotion_tags: ["조급함", "지침", "위로 필요"],
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
    content:
      "젖은 우산을 접는 소리라는 표현이 오늘 퇴근길 제 마음 같아서 큰 위로가 되었습니다.",
    created_at: "2026-11-17T21:15:00.000Z",
  },
  {
    id: "comment-seed-2",
    post_id: "poem-my-library-1",
    author_id: "user-dohyun",
    author_pen_name: "단풍나무 우체부 (도현)",
    quoted_line: "일부러 은행나무가 많은 길로 돌아서 왔다.",
    content:
      "바쁜 일상 속에서도 가을 소리를 들으려 돌아가는 여유가 참 따뜻하게 느껴집니다.",
    created_at: "2026-11-17T22:00:00.000Z",
  },
];

/**
 * RLS(Row Level Security) 정책 검증 함수 (애플리케이션 & 테스트 계층 이중 보호)
 * is_public = false 인 게시글은 오직 작성자 본인(author_id === viewerUserId)만 조회 가능
 */
export function filterPostsByRLS(
  posts: PoemPost[],
  viewerUserId: string | null
): PoemPost[] {
  return posts.filter(
    (post) => post.is_public === true || post.author_id === viewerUserId
  );
}

export function canUserAccessPostByRLS(
  post: PoemPost,
  viewerUserId: string | null
): boolean {
  return post.is_public === true || post.author_id === viewerUserId;
}
