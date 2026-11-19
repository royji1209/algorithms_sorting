export type EmotionValence = "positive" | "neutral" | "negative";

export type PoemMoodValence =
  | "bright"
  | "warm"
  | "calm"
  | "melancholy"
  | "deep_gloomy";

export type DayThemeCode =
  | "mon_similar"
  | "tue_random"
  | "wed_expert"
  | "thu_amateur"
  | "fri_sun_weekly_comfort";

export interface EmotionCheckinResult {
  allowed: boolean;
  guardrailRejected: boolean;
  message: string;
  emotionTags: string[];
  valence: EmotionValence;
  intensity: number;
  isCrisisDetected?: boolean;
  checkinDate: string;
}

export interface PoemPost {
  id: string;
  author_id: string;
  author_pen_name: string;
  title: string;
  content: string;
  category: "poem" | "diary" | "expert_pick";
  emotion_tags: string[];
  mood_valence: PoemMoodValence;
  is_public: boolean;
  is_expert_curated: boolean;
  expert_commentary?: string;
  original_poet?: string;
  created_at: string;
}

export interface LetterDelivery {
  id: string;
  recipient_id: string;
  post_id: string;
  delivery_date: string;
  day_of_week: number;
  theme_code: DayThemeCode;
  theme_label: string;
  curation_note: string;
  is_read: boolean;
  post: PoemPost;
}

export interface EmpathyComment {
  id: string;
  post_id: string;
  author_id: string;
  author_pen_name: string;
  quoted_line: string;
  content: string;
  created_at: string;
}
