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
