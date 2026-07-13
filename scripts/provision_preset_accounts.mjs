import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const csvPath = process.argv[2];
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!csvPath) throw new Error("请提供账户 CSV 路径。");
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY，无法安全创建预设账户。");
}

const source = await fs.readFile(csvPath, "utf8");
const lines = source.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
const header = lines.shift()?.split(",").map((value) => value.trim().toLowerCase());
if (header?.[0] !== "username" || header?.[1] !== "password") {
  throw new Error("CSV 表头必须为 username,password。");
}

const accounts = lines.map((line, index) => {
  const [username = "", password = ""] = line.split(",").map((value) => value.trim());
  if (!/^\d{5}$/.test(username)) throw new Error(`第 ${index + 2} 行账号必须为 5 位数字。`);
  if (password.length < 8) throw new Error(`第 ${index + 2} 行密码少于 8 位。`);
  return { username, password, email: `${username}@preset.starjob.space` };
});

if (new Set(accounts.map(({ username }) => username)).size !== accounts.length) {
  throw new Error("CSV 中存在重复账号。");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const existingByEmail = new Map();
for (let page = 1; ; page += 1) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  data.users.forEach((user) => {
    if (user.email) existingByEmail.set(user.email.toLowerCase(), user);
  });
  if (data.users.length < 1000) break;
}

let created = 0;
let updated = 0;
for (const account of accounts) {
  const existing = existingByEmail.get(account.email);
  const metadata = {
    display_name: account.username,
    username: account.username,
    preset_account: true,
    preset_username: account.username,
  };
  const result = existing
    ? await admin.auth.admin.updateUserById(existing.id, {
        password: account.password,
        email_confirm: true,
        user_metadata: metadata,
      })
    : await admin.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: metadata,
      });
  if (result.error) throw new Error(`账号 ${account.username} 创建失败：${result.error.message}`);
  const user = result.data.user;
  if (!user) throw new Error(`账号 ${account.username} 未返回用户记录。`);

  const { error: profileError } = await admin.from("profiles").upsert({
    id: user.id,
    display_name: account.username,
    role: "user",
  }, { onConflict: "id" });
  if (profileError) throw new Error(`账号 ${account.username} 的资料创建失败：${profileError.message}`);

  if (existing) updated += 1;
  else created += 1;
}

console.log(JSON.stringify({ total: accounts.length, created, updated }));
