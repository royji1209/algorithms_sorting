import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isAuthorizedAdminEmail } from "@/lib/auth/admin-guard";
import { analyzePostMoodAndTags } from "@/lib/ai/gemini-guardrail";
import type { PoemPost } from "@/types/domain";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const cookieEmail = cookieStore.get("mm_user_email")?.value;
  const headerEmail = request.headers.get("x-user-email");
  const activeEmail = cookieEmail || headerEmail || null;

  if (!isAuthorizedAdminEmail(activeEmail)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "관리자 권한이 없습니다." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    const originalPoet = typeof body?.original_poet === "string" ? body.original_poet.trim() : "초대 시인";
    const expertCommentary = typeof body?.expert_commentary === "string" ? body.expert_commentary.trim() : "";

    if (!title || !content) {
      return NextResponse.json({ error: "시 제목과 본문을 모두 입력해 주세요." }, { status: 400 });
    }

    const { emotion_tags, mood_valence } = analyzePostMoodAndTags(title, content);
    const expertPost: PoemPost = {
      id: `expert-poem-${Date.now()}`,
      author_id: "user-admin-curator",
      author_pen_name: `문학 큐레이터 (${originalPoet})`,
      title,
      content,
      category: "expert_pick",
      emotion_tags,
      mood_valence: mood_valence === "deep_gloomy" ? "warm" : mood_valence,
      is_public: true,
      is_expert_curated: true,
      original_poet: originalPoet,
      expert_commentary: expertCommentary || "수요일 문학 전문가 큐레이션을 통해 선정된 추천 시입니다.",
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({ post: expertPost }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "전문가 추천 시 등록 중 오류가 발생했습니다." }, { status: 500 });
  }
}
