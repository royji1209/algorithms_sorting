import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedAdminEmail } from "@/lib/auth/admin-guard";

/**
 * Next.js Middleware
 * - /admin 및 /api/admin 경로에 대한 화이트리스트 이메일 기반 접근 제어 수행
 * - 비로그인 사용자 또는 ADMIN_EMAILS에 포함되지 않은 일반 사용자는 즉시 차단
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    // 1. 쿠키 또는 헤더에서 현재 로그인된 사용자 이메일 확인
    const cookieEmail = request.cookies.get("mm_user_email")?.value;
    const headerEmail = request.headers.get("x-user-email");
    const activeEmail = cookieEmail || headerEmail || null;

    const isAllowed = isAuthorizedAdminEmail(activeEmail);

    if (!isAllowed) {
      // API 요청인 경우 403 Forbidden 반환
      if (pathname.startsWith("/api/admin")) {
        return NextResponse.json(
          {
            error: "FORBIDDEN",
            message:
              "접근 권한이 없습니다. ADMIN_EMAILS에 등록된 관리자 이메일로만 접근할 수 있습니다.",
          },
          { status: 403 }
        );
      }

      // 브라우저 페이지(/admin) 요청인 경우 메인 페이지(/)로 즉시 리다이렉트
      const redirectUrl = new URL("/", request.url);
      redirectUrl.searchParams.set("admin_denied", "1");
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
