"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ensureProfile, translateAuthError } from "@/lib/auth";
import {
  PROFILE_REGION_OPTIONS,
  PROFILE_ROLE_OPTIONS,
  toggleProfileOption,
} from "@/lib/profile-options";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("请输入有效邮箱。"),
  password: z.string().min(6, "密码至少需要 6 位。"),
  displayName: z.string().max(24, "用户名不超过 24 个字。").optional(),
  city: z.string().max(30, "城市不超过 30 个字。").optional(),
  school: z.string().max(40, "学校不超过 40 个字。").optional(),
  major: z.string().max(40, "专业不超过 40 个字。").optional(),
  graduationYear: z.string().max(12, "毕业年份不超过 12 个字。").optional(),
  preferredRegions: z.string().max(80, "意向地区太长了。").optional(),
  targetRoles: z.string().max(120, "意向岗位太长了。").optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      displayName: "",
      city: "",
      school: "",
      major: "",
      graduationYear: "",
      preferredRegions: "",
      targetRoles: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setBusy(true);
    setMessage("");

    try {
      if (!isSupabaseConfigured()) {
        setMessage("请先配置数据库环境变量。");
        return;
      }
      const supabase = createClient();
      if (mode === "register") {
        const preferredRegions = splitProfileInput(values.preferredRegions);
        const targetRoles = splitProfileInput(values.targetRoles);
        const displayName = values.displayName?.trim();
        const city = values.city?.trim() ?? "";
        const school = values.school?.trim() ?? "";
        const major = values.major?.trim() ?? "";
        const graduationYear = values.graduationYear?.trim() ?? "";
        const { data, error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            data: {
              display_name: displayName || values.email.split("@")[0],
              city,
              school,
              major,
              graduation_year: graduationYear,
              preferred_regions: preferredRegions,
              target_roles: targetRoles,
            },
          },
        });
        if (error) throw error;
        if (data.user) {
          await ensureProfile(supabase, data.user, {
            city,
            displayName,
            graduationYear,
            major,
            preferredRegions,
            school,
            targetRoles,
          });
        }
        setMessage("注册成功。若系统要求邮箱验证，请先前往邮箱完成确认。");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        if (error) throw error;
        if (data.user) await ensureProfile(supabase, data.user);
        router.push(searchParams.get("next") || "/");
        router.refresh();
      }
    } catch (error) {
      setMessage(translateAuthError(error instanceof Error ? error.message : undefined));
    } finally {
      setBusy(false);
    }
  }

  const isRegister = mode === "register";
  const selectedRegions = splitProfileInput(useWatch({ control, name: "preferredRegions" }));
  const selectedRoles = splitProfileInput(useWatch({ control, name: "targetRoles" }));

  return (
    <div className="mx-auto w-full max-w-md border border-white/[0.13] bg-[#12294E]/42 p-6 shadow-[0_32px_100px_rgba(0,0,1,0.58)] backdrop-blur-2xl sm:p-8">
      <h1 className="text-center text-3xl font-semibold tracking-[-0.02em] text-ink-primary">
        登录拾星
      </h1>
      <p className="mt-3 text-center text-sm leading-6 text-ink-secondary">
        {isRegister
          ? "注册后保存岗位、简历和投递记录"
          : "登录后查看投递记录"}
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
        {isRegister ? (
          <label className="block">
            <span className="mb-2 block text-sm text-ink-secondary">用户名</span>
            <Input type="text" autoComplete="nickname" {...register("displayName")} />
            {errors.displayName ? (
              <span className="mt-2 block text-xs text-red-200">{errors.displayName.message}</span>
            ) : null}
          </label>
        ) : null}

        <label className="block">
          <span className="mb-2 block text-sm text-ink-secondary">邮箱</span>
          <Input type="email" autoComplete="email" {...register("email")} />
          {errors.email ? (
            <span className="mt-2 block text-xs text-red-200">{errors.email.message}</span>
          ) : null}
        </label>

        {isRegister ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm text-ink-secondary">所在城市</span>
              <Input type="text" placeholder="成都" {...register("city")} />
              {errors.city ? (
                <span className="mt-2 block text-xs text-red-200">{errors.city.message}</span>
              ) : null}
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-ink-secondary">毕业年份</span>
              <Input type="text" placeholder="2027" {...register("graduationYear")} />
              {errors.graduationYear ? (
                <span className="mt-2 block text-xs text-red-200">{errors.graduationYear.message}</span>
              ) : null}
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-ink-secondary">学校</span>
              <Input type="text" placeholder="西南财经大学" {...register("school")} />
              {errors.school ? (
                <span className="mt-2 block text-xs text-red-200">{errors.school.message}</span>
              ) : null}
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-ink-secondary">专业</span>
              <Input type="text" placeholder="金融学" {...register("major")} />
              {errors.major ? (
                <span className="mt-2 block text-xs text-red-200">{errors.major.message}</span>
              ) : null}
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-ink-secondary">意向地区</span>
              <input type="hidden" {...register("preferredRegions")} />
              <LoginOptionGrid
                options={PROFILE_REGION_OPTIONS}
                selected={selectedRegions}
                onToggle={(option) =>
                  setValue("preferredRegions", toggleProfileOption(selectedRegions, option).join("、"), {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
              {errors.preferredRegions ? (
                <span className="mt-2 block text-xs text-red-200">{errors.preferredRegions.message}</span>
              ) : null}
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-ink-secondary">意向岗位</span>
              <input type="hidden" {...register("targetRoles")} />
              <LoginOptionGrid
                options={PROFILE_ROLE_OPTIONS}
                selected={selectedRoles}
                onToggle={(option) =>
                  setValue("targetRoles", toggleProfileOption(selectedRoles, option).join("、"), {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
              {errors.targetRoles ? (
                <span className="mt-2 block text-xs text-red-200">{errors.targetRoles.message}</span>
              ) : null}
            </label>
          </div>
        ) : null}

        <label className="block">
          <span className="mb-2 block text-sm text-ink-secondary">密码</span>
          <Input
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            {...register("password")}
          />
          {errors.password ? (
            <span className="mt-2 block text-xs text-red-200">
              {errors.password.message}
            </span>
          ) : null}
        </label>

        {message ? <p className="info-banner text-sm">{message}</p> : null}

        <Button type="submit" className="w-full" disabled={busy}>
          {isRegister ? "注册" : "登录"}
        </Button>
      </form>

      <button
        type="button"
        className="text-action mx-auto mt-5 flex justify-center text-sm"
        onClick={() => {
          setMode(isRegister ? "login" : "register");
          setMessage("");
        }}
      >
        {isRegister ? "已有账号？去登录" : "还没有账号？去注册"}
      </button>
    </div>
  );
}

function splitProfileInput(value?: string) {
  return Array.from(
    new Set(
      (value ?? "")
        .split(/[、,，/\s]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 12),
    ),
  );
}

function LoginOptionGrid({
  onToggle,
  options,
  selected,
}: {
  onToggle: (option: string) => void;
  options: readonly string[];
  selected: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            className={cn(
              "pressable rounded-full px-3 py-1.5 text-xs font-medium transition",
              active
                ? "bg-[#7E7CB5] text-[#F1EFFF]"
                : "status-pill text-ink-secondary hover:text-ink-primary",
            )}
            aria-pressed={active}
            onClick={() => onToggle(option)}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
