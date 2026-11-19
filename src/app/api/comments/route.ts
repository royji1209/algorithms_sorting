import { NextResponse } from "next/server";
import type { EmpathyComment } from "@/types/domain";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const postId = typeof body?.post_id === "string" ? body.post_id.trim() : "";
    const quotedLine =
      typeof body?.quoted_line === "string" ? body.quoted_line.trim() : "";
    const content =
      typeof body?.content === "string" ? body.content.trim() : "";
    const authorPenName =
      typeof body?.author_pen_name === "string" && body.author_pen_name
        ? body.author_pen_name.trim()
        : "가을산책자";

    if (!postId || !content) {
      return NextResponse.json(
        { error: "마음에 남은 감상 내용을 입력해 주세요." },
        { status: 400 }
      );
    }

    const comment: EmpathyComment = {
      id: `comment-${Date.now()}`,
      post_id: postId,
      author_id: "user-me",
      author_pen_name: authorPenName,
      quoted_line: quotedLine,
      content,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({ comment }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "감상 댓글 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
