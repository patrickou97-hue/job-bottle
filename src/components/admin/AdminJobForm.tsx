"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { JOB_FIELD_LABELS } from "@/lib/constants";
import { toJobPayload } from "@/lib/jobs";
import { isValidHttpUrl } from "@/lib/utils";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { uploadCompanyLogo } from "@/lib/storage";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { Job, JobFormValues } from "@/lib/types";

const jobSchema = z.object({
  company_name: z.string().min(1, "请填写公司名称。"),
  apply_url: z.string().refine(isValidHttpUrl, "请填写有效投递链接。"),
});

const emptyValues: JobFormValues = {
  company_name: "",
  start_date: "",
  industry: "",
  batch_type: "",
  job_titles: "",
  locations: "",
  apply_url: "",
  notes: "",
  logo_url: "",
  tags: "",
  is_active: true,
};

export function AdminJobForm({
  job,
  onSubmit,
  onCancel,
}: {
  job?: Job | null;
  onSubmit: (values: ReturnType<typeof toJobPayload>, id?: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const { register, handleSubmit, reset, setValue } = useForm<JobFormValues>({
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!job) {
      reset(emptyValues);
      return;
    }
    reset({
      company_name: job.company_name,
      start_date: job.start_date ?? "",
      industry: job.industry ?? "",
      batch_type: job.batch_type ?? "",
      job_titles: job.job_titles ?? "",
      locations: job.locations ?? "",
      apply_url: job.apply_url,
      notes: job.notes ?? "",
      logo_url: job.logo_url ?? "",
      tags: job.tags?.join("，") ?? "",
      is_active: job.is_active,
    });
  }, [job, reset]);

  async function submit(values: JobFormValues) {
    setMessage("");
    const result = jobSchema.safeParse(values);
    if (!result.success) {
      setMessage(result.error.issues[0]?.message ?? "请检查表单内容。");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(toJobPayload(values), job?.id);
      setMessage(job ? "岗位已更新。" : "岗位已新增。");
      if (!job) reset(emptyValues);
    } catch {
      setMessage("保存失败，请确认管理员权限和表单内容。");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(file?: File) {
    if (!file) return;
    setMessage("");
    setUploadingLogo(true);
    try {
      if (!isSupabaseConfigured()) {
        setMessage("请先配置数据库环境变量。");
        return;
      }
      const publicUrl = await uploadCompanyLogo(createClient(), file);
      setValue("logo_url", publicUrl, { shouldDirty: true });
      setMessage("公司标识已上传。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "上传失败，请稍后再试。");
    } finally {
      setUploadingLogo(false);
    }
  }

  return (
    <form
      className="rounded-[24px] border border-white/[0.07] bg-white/[0.035] p-5"
      onSubmit={handleSubmit(submit)}
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-ink-primary">
            {job ? "编辑岗位" : "新增岗位"}
          </h2>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-secondary">
          <input type="checkbox" className="accent-nebula-blue" {...register("is_active")} />
          默认展示
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label={JOB_FIELD_LABELS.company_name}>
          <Input {...register("company_name")} />
        </Field>
        <Field label={JOB_FIELD_LABELS.start_date}>
          <Input {...register("start_date")} placeholder="例如 7.2" />
        </Field>
        <Field label={JOB_FIELD_LABELS.industry}>
          <Input {...register("industry")} />
        </Field>
        <Field label={JOB_FIELD_LABELS.batch_type}>
          <Input {...register("batch_type")} />
        </Field>
        <Field label={JOB_FIELD_LABELS.locations}>
          <Input {...register("locations")} />
        </Field>
        <Field label={JOB_FIELD_LABELS.logo_url}>
          <Input {...register("logo_url")} placeholder="图片链接，可选" />
          <label className="mt-2 inline-flex cursor-pointer items-center rounded-full border border-nebula-blue/18 bg-white/[0.035] px-3 py-2 text-xs text-nebula-silver transition hover:border-nebula-blue/34">
            {uploadingLogo ? "正在上传..." : "上传公司标识"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="sr-only"
              disabled={uploadingLogo}
              onChange={(event) => void handleLogoUpload(event.target.files?.[0])}
            />
          </label>
        </Field>
        <Field label={JOB_FIELD_LABELS.apply_url}>
          <Input {...register("apply_url")} />
        </Field>
        <Field label={JOB_FIELD_LABELS.tags}>
          <Input {...register("tags")} placeholder="用逗号、空格或顿号分隔" />
        </Field>
        <Field label={JOB_FIELD_LABELS.job_titles} className="md:col-span-2">
          <Textarea {...register("job_titles")} />
        </Field>
        <Field label={JOB_FIELD_LABELS.notes} className="md:col-span-2">
          <Textarea {...register("notes")} />
        </Field>
      </div>

      {message ? <p className="mt-4 text-sm text-nebula-silver">{message}</p> : null}

      <div className="mt-5 flex gap-3">
        <Button type="submit" disabled={saving}>
          保存
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            取消
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm text-ink-secondary">{label}</span>
      {children}
    </label>
  );
}
