import { NextResponse } from "next/server";
import { analyzePostMoodAndTags } from "@/lib/ai/gemini-guardrail";
import { filterPostsByRLS, INITIAL_SEED_POSTS } from "@/lib/store/seed-data";
import type { PoemPost } from "@/types/domain";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const viewerId = searchParams.get("viewerId") || "user-me";
  const visiblePosts = filterPostsByRLS(INITIAL_SEED_POSTS, viewerId);
  return NextResponse.json({ posts: visiblePosts });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    const isPublic = typeof body?.is_public === "boolean" ? body.is_public : false;
    const category = body?.category === "diary" || body?.category === "poem" ? body.category : "poem";
    const authorId = typeof body?.author_id === "string" && body.author_id ? body.author_id : "user-me";
    const authorPenName = typeof body?.author_pen_name === "string" && body.author_pen_name ? body.author_pen_name : "달무리 서재";

    if (!title || !content) {
      return NextResponse.json({ error: "제목과 본문을 모두 입력해 주세요." }, { status: 400 });
    }

    const { emotion_tags, mood_valence } = analyzePostMoodAndTags(title, content);
    const newPost: PoemPost = {
      id: `post-${Date.now()}`,
      author_id: authorId,
      author_pen_name: authorPenName,
      title,
      content,
      category,
      emotion_tags,
      mood_valence,
      is_public: isPublic,
      is_expert_curated: false,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({ post: newPost }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "글 저장 중 오류가 발생했습니다." }, { status: 500 });
  }
}
