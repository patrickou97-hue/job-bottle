"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createPost } from "@/lib/forum";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";

const GUIDE_CATEGORIES = ["公告", "教程", "分享"] as const;

const schema = z.object({
  title: z.string().min(1, "请输入标题").max(120, "标题不超过120字"),
  category: z.enum(GUIDE_CATEGORIES),
  content: z.string().min(1, "请输入内容").max(5000, "内容不超过5000字"),
  tags: z.string(),
});

type FormValues = z.infer<typeof schema>;

type NewPostFormProps = {
  onCreated: () => void;
  onCancel: () => void;
};

export function NewPostForm({ onCreated, onCancel }: NewPostFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      category: "公告",
      content: "",
      tags: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    setError("");
    try {
      const tags = values.tags
        .split(/[,，、\s]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 8);

      await createPost({
        title: values.title,
        content: values.content,
        category: values.category,
        tags,
      });

      onCreated();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "发布失败，请检查网络后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h2 className="section-title">发布指南内容</h2>
        <p className="mt-1 text-sm leading-6 text-ink-muted">选择内容类型，帮助用户快速判断这是产品公告、操作教程还是求职经验。</p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink-muted">
          标题
        </label>
        <Input placeholder="输入标题" {...register("title")} />
        {errors.title ? (
          <p className="mt-1 text-xs text-[color:var(--text-danger)]">{errors.title.message}</p>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink-muted">
          分类
        </label>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Select value={field.value} onChange={field.onChange}>
              {GUIDE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>
          )}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink-muted">
          内容
        </label>
        <Textarea
          placeholder="写下公告、操作步骤或经验正文"
          rows={6}
          {...register("content")}
        />
        {errors.content ? (
          <p className="mt-1 text-xs text-[color:var(--text-danger)]">{errors.content.message}</p>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink-muted">
          标签（可选，逗号分隔）
        </label>
        <Input
          placeholder="如：使用教程, 简历, 投递"
          {...register("tags")}
        />
      </div>

      {error ? (
        <div className="message-banner text-sm">
          {error}
        </div>
      ) : null}

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "发布中" : "发布内容"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          取消
        </Button>
      </div>
    </form>
  );
}
