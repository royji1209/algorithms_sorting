import type {
  EmotionCheckinResult,
  EmotionValence,
  PoemMoodValence,
} from "../types/domain.ts";

export const GUARDRAIL_REJECTION_MESSAGE =
  "죄송합니다. 오늘의 감정 기록과 시·문학 이야기에 관련된 내용에만 답변할 수 있습니다.";

export const EMOTION_GUARDRAIL_SYSTEM_PROMPT = `당신은 감성 시·일상 기록 웹 서비스 '여백의 우체통'의 마음 안내자입니다.
반드시 아래 [도메인 가드레일 규칙]을 최우선으로 준수하세요:
1. [허용 범위]: 사용자의 오늘 기분, 일상 속 감정 기록, 마음 상태, 시·문학 창작 및 감상과 관련된 이야기에만 공감하고 답변합니다.
2. [엄격한 차단 범위]: 일반 상식 질문, 코딩/프로그래밍, 맛집/여행지 추천, 날씨/주식/코인 정보 등 무관한 모든 입력은 절대 답변하지 마세요.
3. 무관한 질문이 들어오면 isAllowed를 반드시 false로 설정하고, empathyMessage에는 오직 "${GUARDRAIL_REJECTION_MESSAGE}"만 반환하세요.`;

const OFF_TOPIC_PATTERNS: RegExp[] = [
  /맛집|식당\s*추천|점심\s*메뉴\s*추천|저녁\s*메뉴\s*추천|배달\s*추천/i,
  /파이썬|python|자바스크립트|javascript|typescript|리액트|react|코드\s*짜|코딩|알고리즘\s*풀이|구현해\s*줘|프로그래밍|sql|html|css|버그\s*고쳐|퀵소트/i,
  /주식|비트코인|이더리움|코스피|나스닥|환율|로또\s*번호|투자\s*종목/i,
  /날씨\s*알려|기온\s*어때|비\s*오나|내일\s*날씨/i,
  /수도는\s*어디|대통령이\s*누구|역사\s*문제|수학\s*문제|방정식|미적분|번역해\s*줘|요약해\s*줘|이력서\s*첨삭|자기소개서\s*작성/i,
  /레시피\s*알려|끓이는\s*법|만드는\s*법\s*알려/i,
];

const CRISIS_SAFEGUARD_PATTERNS: RegExp[] = [
  /죽고\s*싶|사라지고\s*싶|자해|삶을\s*끝내|살기\s*싫|유서|세상을\s*떠나고/i,
];

export function isOffTopicInput(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  return OFF_TOPIC_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function detectCrisisSignal(input: string): boolean {
  return CRISIS_SAFEGUARD_PATTERNS.some((pattern) => pattern.test(input));
}

export function analyzeEmotionHeuristic(input: string): {
  emotionTags: string[];
  valence: EmotionValence;
  intensity: number;
  empathyMessage: string;
} {
  const text = input.trim();
  const positiveMatches =
    /행복|기쁨|기뻐|설레|즐거|좋았|감사|뿌듯|따뜻|평온|산책|웃음|기분\s*좋|상쾌|후련/.test(
      text
    );
  const negativeMatches =
    /우울|지치|지쳐|힘들|불안|조급|외로|외롭|슬프|슬퍼|눈물|막막|무기력|답답|속상|초조|고단/.test(
      text
    );

  if (positiveMatches && !negativeMatches) {
    return {
      emotionTags: ["행복", "평온", "설렘"],
      valence: "positive",
      intensity: 4,
      empathyMessage:
        "오늘 마음에 머문 밝고 따뜻한 결이 글귀 너머로 전해집니다. 이 소중한 온기가 오래도록 곁에 머물 수 있도록, 오늘의 빛깔에 어울리는 시 편지를 준비했어요.",
    };
  }

  if (negativeMatches) {
    return {
      emotionTags: ["조급함", "지침", "위로 필요"],
      valence: "negative",
      intensity: 4,
      empathyMessage:
        "오늘 하루 참 애쓰셨어요. 마음처럼 흘러가지 않아 조급하고 지치는 날에도 당신의 걸음은 결코 헛되지 않습니다. 잠시 숨을 고르며 기대어 쉴 수 있는 조용한 시 편지를 건네드릴게요.",
    };
  }

  return {
    emotionTags: ["차분함", "일상 기록", "여백"],
    valence: "neutral",
    intensity: 3,
    empathyMessage:
      "오늘 하루의 잔잔한 마음의 결을 조용히 남겨주셨군요. 여백의 우체통이 당신의 고요한 저녁에 작은 쉼표가 될 시 편지를 준비했습니다.",
  };
}

export async function performEmotionCheckinWithGuardrail(
  rawInput: string
): Promise<EmotionCheckinResult> {
  const today = new Date().toISOString().slice(0, 10);
  const trimmed = rawInput.trim();

  if (isOffTopicInput(trimmed)) {
    return {
      allowed: false,
      guardrailRejected: true,
      message: GUARDRAIL_REJECTION_MESSAGE,
      emotionTags: [],
      valence: "neutral",
      intensity: 1,
      isCrisisDetected: false,
      checkinDate: today,
    };
  }

  const isCrisis = detectCrisisSignal(trimmed);
  const fallback = analyzeEmotionHeuristic(trimmed);
  return {
    allowed: true,
    guardrailRejected: false,
    message: fallback.empathyMessage,
    emotionTags: fallback.emotionTags,
    valence: fallback.valence,
    intensity: fallback.intensity,
    isCrisisDetected: isCrisis,
    checkinDate: today,
  };
}

export function analyzePostMoodAndTags(
  title: string,
  content: string
): { emotion_tags: string[]; mood_valence: PoemMoodValence } {
  const combined = `${title} ${content}`;
  if (/절망|암흑|끝없는\s*어둠|무너져|폐허|비명/.test(combined)) {
    return { emotion_tags: ["깊은 밤", "독백"], mood_valence: "deep_gloomy" };
  }
  if (/눈물|슬픔|그리움|외로움|비\s*내리는|쓸쓸|젖은\s*우산/.test(combined)) {
    return { emotion_tags: ["그리움", "위로"], mood_valence: "melancholy" };
  }
  if (/햇살|웃음|기쁨|꽃잎|설렘|봄바람|찬란/.test(combined)) {
    return { emotion_tags: ["햇살", "설렘"], mood_valence: "bright" };
  }
  if (/단풍|따뜻|차\s*한\s*잔|등불|온기|토닥/.test(combined)) {
    return { emotion_tags: ["온기", "다정한 위로"], mood_valence: "warm" };
  }
  return { emotion_tags: ["고요함", "여백"], mood_valence: "calm" };
}
