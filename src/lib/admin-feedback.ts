export type AdminFeedbackStatus = "all" | "open" | "resolved";
export type AdminFeedbackPlatform = "all" | "web" | "miniprogram";

export type AdminFeedbackItem = {
  id: string;
  userId: string | null;
  platform: "web" | "miniprogram";
  category: string;
  content: string;
  contactEmail: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type AdminFeedbackResponse = {
  feedback: AdminFeedbackItem[];
  page: number;
  pageSize: number;
  totalFiltered: number;
  totalPages: number;
  metrics: {
    total: number;
    open: number;
    resolved: number;
    recent: number;
  };
};

export async function fetchAdminFeedback(input: {
  page: number;
  pageSize: number;
  query: string;
  status: AdminFeedbackStatus;
  platform: AdminFeedbackPlatform;
}) {
  const params = new URLSearchParams({
    page: String(input.page),
    pageSize: String(input.pageSize),
    query: input.query,
    status: input.status,
    platform: input.platform,
  });
  const response = await fetch(`/api/admin/feedback?${params.toString()}`, { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = payload && typeof payload === "object" && "error" in payload ? payload.error : null;
    throw new Error(typeof error === "string" ? error : "反馈记录暂时无法读取，请稍后重试。");
  }
  return payload as AdminFeedbackResponse;
}

export async function resolveAdminFeedback(id: string) {
  const response = await fetch("/api/admin/feedback", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = payload && typeof payload === "object" && "error" in payload ? payload.error : null;
    throw new Error(typeof error === "string" ? error : "反馈状态暂时无法保存，请稍后重试。");
  }
  return payload as { feedback: { id: string; resolved_at: string | null } };
}
