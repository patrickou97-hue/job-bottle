"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ensureProfile, translateAuthError } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("请输入有效邮箱。"),
  password: z.string().min(6, "密码至少需要 6 位。"),
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
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
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
        const { data, error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
        });
        if (error) throw error;
        if (data.user) await ensureProfile(supabase, data.user);
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

  return (
    <div className="surface-readable mx-auto w-full max-w-md rounded-[28px] p-6 sm:p-8">
      <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-[22px] border border-nebula-blue/24 bg-nebula-blue/10 text-nebula-blue shadow-star-sm">
        <Sparkles aria-hidden="true" className="size-7" />
      </div>
      <h1 className="text-center text-2xl font-semibold text-ink-primary">
        登录秋招星瓶
      </h1>
      <p className="mt-3 text-center text-sm leading-6 text-ink-secondary">
        {isRegister
          ? "注册后可保存投递记录，跟踪每一份进度。"
          : "登录后管理投递进度。"}
      </p>

      <form className="mt-7 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <label className="block">
          <span className="mb-2 block text-sm text-ink-secondary">邮箱</span>
          <Input type="email" autoComplete="email" {...register("email")} />
          {errors.email ? (
            <span className="mt-2 block text-xs text-red-200">{errors.email.message}</span>
          ) : null}
        </label>

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

        {message ? <p className="text-sm text-nebula-silver">{message}</p> : null}

        <Button type="submit" className="w-full" disabled={busy}>
          {isRegister ? "注册" : "登录"}
        </Button>
      </form>

      <button
        type="button"
        className="mt-5 w-full text-center text-sm text-nebula-silver hover:text-ink-primary"
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
