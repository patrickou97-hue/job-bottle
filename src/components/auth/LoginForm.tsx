"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ensureProfile, translateAuthError } from "@/lib/auth";
import {
  PROFILE_REGION_OPTIONS,
  PROFILE_ROLE_OPTIONS,
  toggleProfileOption,
} from "@/lib/profile-options";
import { cn } from "@/lib/utils";
import { navigateAfterLogin } from "@/lib/arcsweep/login-context";

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

export function LoginForm({ isArcSweepConnect = false }: { isArcSweepConnect?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">(
    searchParams.get("mode") === "register" ? "register" : "login",
  );
  const [loginMethod, setLoginMethod] = useState<"email" | "wechat">("email");
  const [wechatCode, setWechatCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
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

  function continueAfterLogin() {
    navigateAfterLogin(searchParams.get("next"), isArcSweepConnect, {
      assign: (path) => window.location.assign(path),
      push: (path) => router.push(path),
      refresh: () => router.refresh(),
    });
  }

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
        const preferredRegions = isArcSweepConnect ? [] : splitProfileInput(values.preferredRegions);
        const targetRoles = isArcSweepConnect ? [] : splitProfileInput(values.targetRoles);
        const displayName = values.displayName?.trim();
        const city = values.city?.trim() ?? "";
        const school = values.school?.trim() ?? "";
        const major = values.major?.trim() ?? "";
        const graduationYear = values.graduationYear?.trim() ?? "";
        const { data, error } = await supabase.auth.signUp({
          email: registrationEmail,
          password: values.password,
          options: {
            data: isArcSweepConnect
              ? {
                  display_name: displayName || registrationEmail.split("@")[0],
                  // User-editable routing metadata only. The database trigger
                  // uses it to avoid creating a StarJob job-seeker profile;
                  // it must never be used for authorization decisions.
                  account_surface: "arc",
                }
              : {
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
        if (data.user && data.session && !isArcSweepConnect) {
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
          continueAfterLogin();
          return;
        }
        setMode("login");
        setMessage(isArcSweepConnect
          ? "Arc 账号已创建。请到注册邮箱完成验证，再登录并继续连接。"
          : "注册成功。请到注册邮箱完成验证，再登录并继续刚才的操作。");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizeLoginAccount(values.account),
          password: values.password,
        });
        if (error) throw error;
        if (data.user && !isArcSweepConnect) await ensureProfile(supabase, data.user);
        continueAfterLogin();
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
      continueAfterLogin();
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
    <div className={`login-form mx-auto w-full max-w-md py-4 sm:py-8 lg:py-10${isArcSweepConnect ? " login-form--arcsweep-connect" : ""}`}>
      {isArcSweepConnect ? (
        <>
          <aside className="login-form__product-return" aria-label="ArcSweep 授权登录说明">
            <Image src="/brand/arcsweep-icon-mark.png" width={32} height={32} alt="" />
            <div>
              <strong>继续连接 ArcSweep</strong>
              <span>登录后返回授权确认页；是否连接由你决定。此时不会扫描或上传文件。本地扫描和安全清理无需登录。</span>
            </div>
          </aside>
          <ol className="login-form__connection-steps" aria-label="ArcSweep 连接步骤">
            <li aria-current="step"><span>01</span><strong>{isRegister ? "创建 Arc 账号" : "登录 Arc 账号"}</strong></li>
            <li><span>02</span><span>确认授权</span></li>
            <li><span>03</span><span>返回 ArcSweep</span></li>
          </ol>
        </>
      ) : null}
      <h1 className="login-form__title text-3xl font-semibold tracking-[-0.02em] text-ink-primary">
        {isArcSweepConnect ? (isRegister ? "创建 Arc 账号" : "登录 Arc 账号") : (isRegister ? "创建拾星账号" : "登录拾星")}
      </h1>
      <p className="login-form__subtitle mt-3 text-center text-sm leading-6 text-ink-secondary">
        {searchParams.get("reason") === "resume-download"
          ? "当前简历已保存在本浏览器。完成注册或登录后，将自动返回下载页面。"
          : isArcSweepConnect
          ? "登录仅用于使用 ArcSweep 的云端 AI 复核；文件内容和完整路径仍留在本机。"
          : isRegister
          ? "注册后，保存岗位、简历与投递记录。"
          : "继续整理你的岗位、简历与投递进展。"}
      </p>

      {!isRegister && !isArcSweepConnect ? (
        <div className="login-form__method-switch">
          <SegmentedControl ariaLabel="登录方式" value={loginMethod} options={[{value: "email", label: "邮箱登录"}, {value: "wechat", label: "微信登录"}]} onChange={(value) => { setLoginMethod(value); setMessage(""); }} />
        </div>
      ) : null}

      {!isRegister && !isArcSweepConnect && loginMethod === "wechat" ? (
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
              name="wechatCode"
              placeholder="请输入 8 位数字"
              className="text-center font-mono text-lg tracking-[0.24em]"
            />
          </label>
          {message ? <p className="info-banner text-sm" role="status" aria-live="polite">{message}</p> : null}
          <Button type="submit" className="w-full" aria-busy={busy} disabled={busy || wechatCode.length !== 8}>
            使用微信账户登录
          </Button>
        </form>
      ) : (
      <form className={!isRegister ? "mt-6 space-y-5" : "mt-8 space-y-5"} onSubmit={handleSubmit(onSubmit)}>
        {isRegister ? (
          <label className="block">
            <span className="mb-2 block text-sm text-ink-secondary">用户名</span>
            <Input
              type="text"
              autoComplete="nickname"
              aria-invalid={Boolean(errors.displayName)}
              aria-describedby={errors.displayName ? "auth-display-name-error" : undefined}
              {...register("displayName")}
            />
            {errors.displayName ? (
              <span id="auth-display-name-error" className="mt-2 block text-xs text-[color:var(--text-danger)]">{errors.displayName.message}</span>
            ) : null}
          </label>
        ) : null}

        <label className="block">
          <span className="mb-2 block text-sm text-ink-secondary">{isRegister ? "邮箱" : "账号或邮箱"}</span>
          <Input
            type={isRegister ? "email" : "text"}
            autoComplete={isRegister ? "email" : "username"}
            aria-invalid={Boolean(errors.account)}
            aria-describedby={errors.account ? "auth-account-error" : undefined}
            {...register("account")}
          />
          {errors.account ? (
            <span id="auth-account-error" className="mt-2 block text-xs text-[color:var(--text-danger)]">{errors.account.message}</span>
          ) : null}
        </label>

        {isRegister && !isArcSweepConnect ? (
          <details className="auth-profile-details">
            <summary>补充求职资料 <span>选填，也可以稍后完善</span></summary>
            <div className="grid gap-5 sm:grid-cols-2 pt-5">
            <label className="block">
              <span className="mb-2 block text-sm text-ink-secondary">所在城市</span>
              <Input type="text" autoComplete="address-level2" aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? "auth-city-error" : undefined} {...register("city")} />
              {errors.city ? (
                <span id="auth-city-error" className="mt-2 block text-xs text-[color:var(--text-danger)]">{errors.city.message}</span>
              ) : null}
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-ink-secondary">毕业年份</span>
              <Input type="text" inputMode="numeric" autoComplete="off" placeholder="2027" aria-invalid={Boolean(errors.graduationYear)} aria-describedby={errors.graduationYear ? "auth-graduation-year-error" : undefined} {...register("graduationYear")} />
              {errors.graduationYear ? (
                <span id="auth-graduation-year-error" className="mt-2 block text-xs text-[color:var(--text-danger)]">{errors.graduationYear.message}</span>
              ) : null}
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-ink-secondary">学校</span>
              <Input type="text" autoComplete="organization" aria-invalid={Boolean(errors.school)} aria-describedby={errors.school ? "auth-school-error" : undefined} {...register("school")} />
              {errors.school ? (
                <span id="auth-school-error" className="mt-2 block text-xs text-[color:var(--text-danger)]">{errors.school.message}</span>
              ) : null}
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-ink-secondary">专业</span>
              <Input type="text" autoComplete="off" aria-invalid={Boolean(errors.major)} aria-describedby={errors.major ? "auth-major-error" : undefined} {...register("major")} />
              {errors.major ? (
                <span id="auth-major-error" className="mt-2 block text-xs text-[color:var(--text-danger)]">{errors.major.message}</span>
              ) : null}
            </label>
            <fieldset className="min-w-0" aria-describedby={errors.preferredRegions ? "auth-regions-error" : undefined}>
              <legend className="mb-2 block text-sm text-ink-secondary">意向地区</legend>
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
                <span id="auth-regions-error" className="mt-2 block text-xs text-[color:var(--text-danger)]">{errors.preferredRegions.message}</span>
              ) : null}
            </fieldset>
            <fieldset className="min-w-0" aria-describedby={errors.targetRoles ? "auth-roles-error" : undefined}>
              <legend className="mb-2 block text-sm text-ink-secondary">意向岗位</legend>
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
                <span id="auth-roles-error" className="mt-2 block text-xs text-[color:var(--text-danger)]">{errors.targetRoles.message}</span>
              ) : null}
            </fieldset>
            </div>
          </details>
        ) : null}

        <div className="block">
          <label htmlFor="auth-password" className="mb-2 block text-sm text-ink-secondary">密码</label>
          <div className="relative">
            <Input
            id="auth-password"
            className="pr-12"
            type={passwordVisible ? "text" : "password"}
            autoComplete={isRegister ? "new-password" : "current-password"}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "auth-password-error" : undefined}
            {...register("password")}
            />
            <button type="button" className="auth-password-toggle" aria-label={passwordVisible ? "隐藏密码" : "显示密码"} aria-pressed={passwordVisible} onClick={() => setPasswordVisible((visible) => !visible)}>
              {passwordVisible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
            </button>
          </div>
          {errors.password ? (
            <span id="auth-password-error" className="mt-2 block text-xs text-[color:var(--text-danger)]">
              {errors.password.message}
            </span>
          ) : null}
        </div>

        {message ? <p className="info-banner text-sm" role="status" aria-live="polite">{message}</p> : null}

        <Button type="submit" className="w-full" aria-busy={busy} disabled={busy}>
          {busy ? (isRegister ? "正在创建账号…" : "正在登录…") : (isRegister ? "创建账号" : "登录")}
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
          clearErrors();
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
