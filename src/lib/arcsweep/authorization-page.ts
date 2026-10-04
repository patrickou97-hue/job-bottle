type AuthorizationLocale = "zh-CN" | "en";

type AuthorizationPageInput = {
  locale: AuthorizationLocale;
  email: string | null;
  params: Record<string, string>;
};

const consentFields = [
  "client_id",
  "redirect_uri",
  "response_type",
  "code_challenge",
  "code_challenge_method",
  "state",
] as const;

const copy = {
  "zh-CN": {
    language: "zh-CN",
    title: "连接 ArcSweep · Arc 账号",
    eyebrow: "账户授权",
    secure: "授权前确认",
    heading: "是否允许 ArcSweep 连接你的 Arc 账号？",
    intro: "连接账号只为启用云端 AI 复核。此时不会扫描、调用 AI 或上传文件。",
    accountLabel: "当前 Arc 账号",
    fallbackAccount: "已登录的 Arc 账号",
    detailTitle: "之后会发生什么",
    detailOne: "之后每次云端复核都由你主动发起，只发送清理候选组摘要。",
    detailTwo: "文件内容和完整个人路径留在本机；AI 只能给建议，不能删除文件。",
    detailThree: "本地扫描、分类和安全清理不依赖登录。",
    approve: "同意并连接",
    deny: "暂不连接，返回 ArcSweep",
    skipToContent: "跳转到主要内容",
    formLabel: "确认 ArcSweep 账号连接",
    footer: "你可以随时在 ArcSweep 设置中退出 Arc 账号。",
  },
  en: {
    language: "en",
    title: "Connect ArcSweep · Arc Account",
    eyebrow: "ACCOUNT AUTHORIZATION",
    secure: "REVIEW BEFORE CONNECTING",
    heading: "Allow ArcSweep to connect to your Arc account?",
    intro: "Connecting enables cloud AI review. This step will not scan, call AI, or upload files.",
    accountLabel: "SIGNED-IN ARC ACCOUNT",
    fallbackAccount: "Signed-in Arc account",
    detailTitle: "What happens next",
    detailOne: "You start each cloud review; only a summary of cleanup groups is sent.",
    detailTwo: "File contents and full personal paths stay on your Mac; AI can advise but cannot delete files.",
    detailThree: "Local scanning, classification, and safe cleanup do not require sign-in.",
    approve: "Agree and connect",
    deny: "Not now — return to ArcSweep",
    skipToContent: "Skip to main content",
    formLabel: "Confirm ArcSweep account connection",
    footer: "You can disconnect your Arc account at any time in ArcSweep Settings.",
  },
} as const;

function escapeHTML(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

export function renderAuthorizationPage(input: AuthorizationPageInput): string {
  const text = copy[input.locale];
  const hiddenInputs = consentFields.map(name =>
    `<input type="hidden" name="${name}" value="${escapeHTML(input.params[name] ?? "")}">`,
  ).join("");
  const account = input.email ? escapeHTML(input.email) : text.fallbackAccount;

  return `<!doctype html>
<html lang="${text.language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${text.title}</title>
  <style>
    :root{color-scheme:light;--ink:#201b27;--muted:#6d6674;--line:#e9e5ed;--paper:#fbfafd;--accent:#694c91;--accent-soft:#f0eafa;--gold:#aa8954}
    *{box-sizing:border-box}
    body{margin:0;min-height:100vh;background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
    .skip-link{position:absolute;top:8px;left:20px;z-index:2;transform:translateY(-160%);padding:10px 14px;border-radius:8px;background:var(--ink);color:#fff;font-size:14px;text-decoration:none}
    .skip-link:focus-visible{transform:translateY(0);outline:3px solid #a989d4;outline-offset:3px}
    .page{width:min(100% - 40px,760px);min-height:100vh;margin:0 auto;display:flex;flex-direction:column}
    header{height:92px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line)}
    .brand{display:flex;align-items:center;gap:12px;color:var(--ink);text-decoration:none;font-size:16px;font-weight:650;letter-spacing:-.025em}
    .brand img{width:42px;height:42px;object-fit:contain}
    .status{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:12px;letter-spacing:.06em;text-transform:uppercase}
    .status i{width:7px;height:7px;border-radius:50%;background:var(--gold);display:block}
    main{width:min(100%,520px);margin:auto;padding:60px 0 68px}
    .eyebrow{margin:0 0 22px;color:var(--gold);font-size:11px;font-weight:700;letter-spacing:.16em}
    h1{max-width:500px;margin:0;font-size:clamp(30px,6vw,44px);line-height:1.14;letter-spacing:-.055em;font-weight:650;text-wrap:balance}
    .intro{margin:18px 0 34px;max-width:460px;color:var(--muted);font-size:16px;line-height:1.7}
    .account{padding:18px 0 17px;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
    .account-label{display:block;margin-bottom:8px;color:var(--muted);font-size:11px;font-weight:650;letter-spacing:.1em}
    .account-value{font-size:15px;font-weight:600;overflow-wrap:anywhere}
    .details{padding:25px 0 22px}
    .details h2{margin:0 0 16px;font-size:14px;font-weight:700;letter-spacing:-.01em}
    .details ol{display:grid;gap:12px;margin:0;padding:0;list-style:none}
    .details li{display:grid;grid-template-columns:22px 1fr;gap:11px;color:#514b58;font-size:14px;line-height:1.58}
    .details li span:first-child{color:var(--accent);font-size:12px;font-weight:700;font-variant-numeric:tabular-nums;padding-top:2px}
    form{display:grid;gap:10px;margin-top:10px}
    button{width:100%;min-height:48px;border-radius:10px;font:inherit;font-size:14px;font-weight:650;cursor:pointer;touch-action:manipulation;transition:background-color .15s ease,border-color .15s ease,transform .15s ease}
    button:active{transform:translateY(1px)}
    button:focus-visible{outline:3px solid #a989d4;outline-offset:3px}
    .approve{border:1px solid var(--accent);background:var(--accent);color:#fff}
    .approve:hover{background:#563b7b;border-color:#563b7b}
    .deny{border:1px solid transparent;background:transparent;color:var(--muted)}
    .deny:hover{border-color:var(--line);background:#fff;color:var(--ink)}
    footer{padding:20px 0 28px;border-top:1px solid var(--line);color:var(--muted);font-size:12px;line-height:1.5}
    @media(max-width:560px){.page{width:min(100% - 32px,760px)}header{height:76px}.brand img{width:36px;height:36px}.status{font-size:10px}main{padding:44px 0 48px}.intro{font-size:15px}}
    @media(prefers-reduced-motion:reduce){.skip-link,button{transition:none}}
  </style>
</head>
<body>
  <a class="skip-link" href="#main-content">${text.skipToContent}</a>
  <div class="page">
    <header>
      <div class="brand"><img src="/brand/arcsweep-icon-mark.png" width="42" height="42" alt=""><span>ArcSweep</span></div>
      <div class="status"><i aria-hidden="true"></i>${text.secure}</div>
    </header>
    <main id="main-content">
      <p class="eyebrow">${text.eyebrow}</p>
      <h1>${text.heading}</h1>
      <p class="intro">${text.intro}</p>
      <section class="account" aria-label="${text.accountLabel}">
        <span class="account-label">${text.accountLabel}</span>
        <div class="account-value">${account}</div>
      </section>
      <section class="details" aria-labelledby="next-title">
        <h2 id="next-title">${text.detailTitle}</h2>
        <ol>
          <li><span>01</span><span>${text.detailOne}</span></li>
          <li><span>02</span><span>${text.detailTwo}</span></li>
          <li><span>03</span><span>${text.detailThree}</span></li>
        </ol>
      </section>
      <form method="post" aria-label="${text.formLabel}">
        ${hiddenInputs}
        <button class="approve" type="submit" name="decision" value="approve">${text.approve}</button>
        <button class="deny" type="submit" name="decision" value="deny">${text.deny}</button>
      </form>
    </main>
    <footer>${text.footer}</footer>
  </div>
</body>
</html>`;
}
