import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedAdminEmail } from "@/lib/auth/admin-guard";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const cookieEmail = request.cookies.get("mm_user_email")?.value;
    const headerEmail = request.headers.get("x-user-email");
    const activeEmail = cookieEmail || headerEmail || null;

    const isAllowed = isAuthorizedAdminEmail(activeEmail);

    if (!isAllowed) {
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
