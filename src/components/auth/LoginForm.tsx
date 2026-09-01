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
  account: z.string().min(1, "请输入账号或邮箱。"),
  password: z.string().min(6, "密码至少需要 6 位。"),
  displayName: z.string().max(24, "用户名最多填写 24 个字。").optional(),
  city: z.string().max(30, "城市最多填写 30 个字。").optional(),
  school: z.string().max(40, "学校最多填写 40 个字。").optional(),
  major: z.string().max(40, "专业最多填写 40 个字。").optional(),
  graduationYear: z.string().max(12, "毕业年份最多填写 12 个字。").optional(),
  preferredRegions: z.string().max(80, "意向地区填写内容过长，请适当精简。").optional(),
  targetRoles: z.string().max(120, "意向岗位填写内容过长，请适当精简。").optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">(
    searchParams.get("mode") === "register" ? "register" : "login",
  );
  const [loginMethod, setLoginMethod] = useState<"email" | "wechat">("email");
  const [wechatCode, setWechatCode] = useState("");
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
      account: "",
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
        console.error("Supabase environment variables are not configured.");
        setMessage("登录服务暂时不可用，请稍后重试。");
        return;
      }
      const supabase = createClient();
      if (mode === "register") {
        const emailResult = z.string().email().safeParse(values.account.trim());
        if (!emailResult.success) {
          setMessage("请输入有效的注册邮箱。");
          return;
        }
        const registrationEmail = emailResult.data;
        const preferredRegions = splitProfileInput(values.preferredRegions);
        const targetRoles = splitProfileInput(values.targetRoles);
        const displayName = values.displayName?.trim();
        const city = values.city?.trim() ?? "";
        const school = values.school?.trim() ?? "";
        const major = values.major?.trim() ?? "";
        const graduationYear = values.graduationYear?.trim() ?? "";
        const { data, error } = await supabase.auth.signUp({
          email: registrationEmail,
          password: values.password,
          options: {
            data: {
              display_name: displayName || registrationEmail.split("@")[0],
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
        if (data.user && data.session) {
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
        if (data.session) {
          router.push(getSafeNextPath(searchParams.get("next")));
          router.refresh();
          return;
        }
        setMode("login");
        setMessage("注册成功。若需邮箱验证，请先完成确认；登录后将返回简历制作页面。");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizeLoginAccount(values.account),
          password: values.password,
        });
        if (error) throw error;
        if (data.user) await ensureProfile(supabase, data.user);
        router.push(getSafeNextPath(searchParams.get("next")));
        router.refresh();
      }
    } catch (error) {
      setMessage(translateAuthError(error instanceof Error ? error.message : undefined));
    } finally {
      setBusy(false);
    }
  }

  async function onWechatCodeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/wechat-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: wechatCode }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "微信登录未完成，请重新尝试。");
      router.push(getSafeNextPath(searchParams.get("next")));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "微信登录未完成，请重新尝试。");
    } finally {
      setBusy(false);
    }
  }

  const isRegister = mode === "register";
  const selectedRegions = splitProfileInput(useWatch({ control, name: "preferredRegions" }));
  const selectedRoles = splitProfileInput(useWatch({ control, name: "targetRoles" }));

  return (
    <div className="login-form mx-auto w-full max-w-md py-4 sm:py-8 lg:py-10">
      <h1 className={cn(
        "login-form__title text-center text-3xl font-semibold tracking-[-0.02em] text-ink-primary",
        !isRegister && "sr-only",
      )}>
        {isRegister ? "创建拾星账号" : "登录拾星"}
      </h1>
      <p className="login-form__subtitle mt-3 text-center text-sm leading-6 text-ink-secondary">
        {searchParams.get("reason") === "resume-download"
          ? "当前简历已保存在本浏览器。完成注册或登录后，将自动返回下载页面。"
          : isRegister
          ? "注册后，保存岗位、简历与投递记录。"
          : "继续整理你的岗位、简历与投递进展。"}
      </p>

      {!isRegister ? (
        <div className="login-form__method-switch mt-7 grid grid-cols-2 rounded-xl bg-[color:var(--surface-hover-bg)] p-1">
          <button
            type="button"
            aria-pressed={loginMethod === "email"}
            className={cn(
              "login-form__method min-h-10 rounded-lg px-3 text-sm font-medium transition",
              loginMethod === "email" ? "bg-[color:var(--surface-read-bg-strong)] text-ink-primary shadow-sm" : "text-ink-muted",
            )}
            onClick={() => { setLoginMethod("email"); setMessage(""); }}
          >
            邮箱登录
          </button>
          <button
            type="button"
            aria-pressed={loginMethod === "wechat"}
            className={cn(
              "login-form__method min-h-10 rounded-lg px-3 text-sm font-medium transition",
              loginMethod === "wechat" ? "bg-[color:var(--surface-read-bg-strong)] text-ink-primary shadow-sm" : "text-ink-muted",
            )}
            onClick={() => { setLoginMethod("wechat"); setMessage(""); }}
          >
            微信登录
          </button>
        </div>
      ) : null}

      {!isRegister && loginMethod === "wechat" ? (
        <form className="mt-6 space-y-5" onSubmit={onWechatCodeSubmit}>
          <div className="info-banner text-sm leading-6">
            打开拾星小程序，在“我的”中生成 8 位网页登录码。登录码 5 分钟内有效，使用一次后立即失效。
          </div>
          <label className="block">
            <span className="mb-2 block text-sm text-ink-secondary">网页登录码</span>
            <Input
              value={wechatCode}
              onChange={(event) => setWechatCode(event.target.value.replace(/\D/g, "").slice(0, 8))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="请输入 8 位数字"
              className="text-center font-mono text-lg tracking-[0.24em]"
            />
          </label>
          {message ? <p className="info-banner text-sm" role="status" aria-live="polite">{message}</p> : null}
          <Button type="submit" className="w-full" disabled={busy || wechatCode.length !== 8}>
            使用微信账户登录
          </Button>
        </form>
      ) : (
      <form className={!isRegister ? "mt-6 space-y-5" : "mt-8 space-y-5"} onSubmit={handleSubmit(onSubmit)}>
        {isRegister ? (
          <label className="block">
            <span className="mb-2 block text-sm text-ink-secondary">用户名</span>
            <Input type="text" autoComplete="nickname" {...register("displayName")} />
            {errors.displayName ? (
              <span className="mt-2 block text-xs text-[color:var(--text-danger)]">{errors.displayName.message}</span>
            ) : null}
          </label>
        ) : null}

        <label className="block">
          <span className="mb-2 block text-sm text-ink-secondary">{isRegister ? "邮箱" : "账号或邮箱"}</span>
          <Input type={isRegister ? "email" : "text"} autoComplete={isRegister ? "email" : "username"} {...register("account")} />
          {errors.account ? (
            <span className="mt-2 block text-xs text-[color:var(--text-danger)]">{errors.account.message}</span>
          ) : null}
        </label>

        {isRegister ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm text-ink-secondary">所在城市</span>
              <Input type="text" {...register("city")} />
              {errors.city ? (
                <span className="mt-2 block text-xs text-[color:var(--text-danger)]">{errors.city.message}</span>
              ) : null}
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-ink-secondary">毕业年份</span>
              <Input type="text" placeholder="2027" {...register("graduationYear")} />
              {errors.graduationYear ? (
                <span className="mt-2 block text-xs text-[color:var(--text-danger)]">{errors.graduationYear.message}</span>
              ) : null}
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-ink-secondary">学校</span>
              <Input type="text" {...register("school")} />
              {errors.school ? (
                <span className="mt-2 block text-xs text-[color:var(--text-danger)]">{errors.school.message}</span>
              ) : null}
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-ink-secondary">专业</span>
              <Input type="text" {...register("major")} />
              {errors.major ? (
                <span className="mt-2 block text-xs text-[color:var(--text-danger)]">{errors.major.message}</span>
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
                <span className="mt-2 block text-xs text-[color:var(--text-danger)]">{errors.preferredRegions.message}</span>
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
                <span className="mt-2 block text-xs text-[color:var(--text-danger)]">{errors.targetRoles.message}</span>
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
            <span className="mt-2 block text-xs text-[color:var(--text-danger)]">
              {errors.password.message}
            </span>
          ) : null}
        </label>

        {message ? <p className="info-banner text-sm" role="status" aria-live="polite">{message}</p> : null}

        <Button type="submit" className="w-full" disabled={busy}>
          {isRegister ? "注册" : "登录"}
        </Button>
      </form>
      )}

      <button
        type="button"
        className="text-action mx-auto mt-5 flex justify-center text-sm"
        onClick={() => {
          setMode(isRegister ? "login" : "register");
          setLoginMethod("email");
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

function getSafeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function normalizeLoginAccount(value: string) {
  const account = value.trim();
  return /^\d{5}$/.test(account) ? `${account}@preset.starjob.space` : account;
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
              "pressable rounded-lg border border-transparent px-3 py-1.5 text-xs font-medium transition",
                active
                ? "border border-[color:var(--aurora)]/25 bg-[color:var(--surface-selected-bg)] text-ink-primary"
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
