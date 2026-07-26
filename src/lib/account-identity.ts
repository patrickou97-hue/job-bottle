export const WECHAT_INTERNAL_EMAIL_DOMAIN = "wechat.starjob.internal";

export type AccountType = "email" | "wechat" | "linked";

export function isWechatInternalEmail(email: string | null | undefined) {
  return Boolean(
    email &&
    email.toLocaleLowerCase("en-US").endsWith(`@${WECHAT_INTERNAL_EMAIL_DOMAIN}`),
  );
}

export function getAccountType(
  email: string | null | undefined,
  hasWechatIdentity: boolean,
): AccountType {
  if (!hasWechatIdentity) return "email";
  return email && !isWechatInternalEmail(email) ? "linked" : "wechat";
}

export function getWechatInternalEmail(userId: string) {
  return `${userId}@${WECHAT_INTERNAL_EMAIL_DOMAIN}`;
}
