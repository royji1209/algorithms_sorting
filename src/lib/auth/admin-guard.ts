/**
 * 관리자 화이트리스트 이메일 검증 모듈
 * 환경 변수 ADMIN_EMAILS에 등록된 이메일만 /admin 및 전문가 시 등록 API에 접근 가능
 */
export function getAdminEmailWhitelist(): string[] {
  const raw =
    process.env.ADMIN_EMAILS ||
    "admin@marginmailbox.kr,curator@marginmailbox.kr";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAuthorizedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const whitelist = getAdminEmailWhitelist();
  return whitelist.includes(normalized);
}
