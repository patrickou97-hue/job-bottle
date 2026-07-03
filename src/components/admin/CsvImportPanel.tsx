"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Upload } from "lucide-react";
import { parseJobsCsv } from "@/lib/csv";
import { getCurrentUserOrNull } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import type { CsvImportPreviewRow } from "@/lib/types";

export function CsvImportPanel() {
  const [rows, setRows] = useState<CsvImportPreviewRow[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      if (!isSupabaseConfigured()) {
        setMessage("请先配置数据库环境变量。");
        return;
      }
      const supabase = createClient();
      const user = await getCurrentUserOrNull(supabase);
      if (!user) {
        setMessage("请先登录管理员账号。");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.role !== "admin") {
        setMessage("无权限访问。");
        return;
      }
      setIsAdmin(true);
    }
    checkAdmin();
  }, []);

  const validRows = useMemo(() => rows.filter((row) => row.isValid), [rows]);
  const invalidRows = useMemo(() => rows.filter((row) => !row.isValid), [rows]);

  async function handleFile(file?: File) {
    if (!file) return;
    setMessage("");
    try {
      setRows(await parseJobsCsv(file));
    } catch {
      setMessage("CSV 解析失败，请检查文件格式。");
    }
  }

  async function handleImport() {
    setBusy(true);
    setMessage("");
    try {
      if (!isSupabaseConfigured()) {
        setMessage("请先配置数据库环境变量。");
        return;
      }
      const payload = validRows.map((row) => ({
        company_name: row.company_name,
        start_date: row.start_date,
        industry: row.industry,
        batch_type: row.batch_type,
        job_titles: row.job_titles,
        locations: row.locations,
        apply_url: row.apply_url,
        notes: row.notes,
        tags: row.tags,
        is_active: true,
      }));
      if (payload.length > 0) {
        const { error } = await createClient().from("jobs").insert(payload);
        if (error) throw error;
      }
      setMessage(`导入完成：成功 ${payload.length} 条，跳过 ${invalidRows.length} 条。`);
    } catch {
      setMessage("导入失败，请确认管理员权限或检查数据。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-white/[0.07] bg-white/[0.035] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-ink-primary">批量导入</h1>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">
              请上传包含以下字段的 CSV 文件：公司名称、开启时间、所在行业、类型、招聘岗位、工作地点、投递链接、备注。
            </p>
          </div>
          <Link href="/admin/jobs">
            <Button variant="secondary" className="gap-2">
              <ArrowLeft aria-hidden="true" className="size-4" />
              返回岗位管理
            </Button>
          </Link>
        </div>
      </section>

      {message ? (
        <div className="rounded-[22px] border border-nebula-blue/20 bg-nebula-blue/8 p-4 text-sm text-nebula-silver">
          {message}
        </div>
      ) : null}

      {isAdmin ? (
        <>
          <section className="rounded-[24px] border border-white/[0.07] bg-white/[0.035] p-5">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-[22px] border border-dashed border-nebula-blue/24 bg-white/[0.035] p-8 text-center transition hover:border-nebula-blue/45">
              <Upload aria-hidden="true" className="mb-3 size-8 text-nebula-blue" />
              <span className="text-base font-semibold text-ink-primary">上传 CSV</span>
              <span className="mt-2 text-sm text-ink-muted">选择文件后将自动预览导入结果</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
            </label>
          </section>

          {rows.length > 0 ? (
            <section className="overflow-hidden rounded-[24px] border border-white/[0.07] bg-white/[0.035]">
              <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-ink-secondary">
                  预览导入：可导入 {validRows.length} 条，跳过 {invalidRows.length} 条
                </div>
                <Button onClick={handleImport} disabled={busy || validRows.length === 0}>
                  确认导入
                </Button>
              </div>

              {invalidRows.length > 0 ? (
                <div className="border-b border-white/[0.07] bg-red-500/10 p-4 text-sm text-red-100">
                  {invalidRows.slice(0, 8).map((row) => (
                    <div key={row.rowNumber}>
                      第 {row.rowNumber} 行{row.errors.join("，")}，已跳过。
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="overflow-x-auto">
                <table className="min-w-[980px] w-full text-left text-sm">
                  <thead className="bg-white/[0.04] text-ink-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">行号</th>
                      <th className="px-4 py-3 font-medium">公司名称</th>
                      <th className="px-4 py-3 font-medium">招聘岗位</th>
                      <th className="px-4 py-3 font-medium">所在行业</th>
                      <th className="px-4 py-3 font-medium">批次类型</th>
                      <th className="px-4 py-3 font-medium">工作地点</th>
                      <th className="px-4 py-3 font-medium">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 80).map((row) => (
                      <tr key={row.rowNumber} className="border-t border-white/5 text-ink-secondary">
                        <td className="px-4 py-3">{row.rowNumber}</td>
                        <td className="px-4 py-3 text-ink-primary">{row.company_name || "缺失"}</td>
                        <td className="max-w-[280px] px-4 py-3">
                          <span className="line-clamp-2">{row.job_titles || "暂无"}</span>
                        </td>
                        <td className="px-4 py-3">{row.industry || "暂无"}</td>
                        <td className="px-4 py-3">{row.batch_type || "暂无"}</td>
                        <td className="px-4 py-3">{row.locations || "暂无"}</td>
                        <td className="px-4 py-3">
                          {row.isValid ? (
                            <span className="text-nebula-silver">可导入</span>
                          ) : (
                            <span className="text-red-200">已跳过</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
