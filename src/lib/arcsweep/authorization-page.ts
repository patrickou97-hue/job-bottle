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

type AuthorizationSuccessInput = {
  locale: AuthorizationLocale;
  callbackURL: string;
};

/**
 * Safari does not consistently open a custom URL scheme from an HTTP redirect
 * after a form POST. Keep the short-lived PKCE callback on this same-origin
 * page until the user clicks the explicit return link.
 */
export function renderAuthorizationSuccessPage(input: AuthorizationSuccessInput): string {
  let callback: URL;
  try {
    callback = new URL(input.callbackURL);
  } catch {
    throw new Error("invalid ArcSweep callback URL");
  }
  if (callback.protocol !== "arcsweep:"
    || callback.hostname !== "oauth"
    || callback.pathname !== "/callback"
    || callback.searchParams.getAll("code").length !== 1
    || callback.searchParams.getAll("state").length !== 1
    || !/^[A-Za-z0-9_-]{43}$/.test(callback.searchParams.get("code") ?? "")
    || !/^[A-Za-z0-9_-]{32,128}$/.test(callback.searchParams.get("state") ?? "")
    || [...callback.searchParams.keys()].some(name => name !== "code" && name !== "state")) {
    throw new Error("invalid ArcSweep callback URL");
  }

  const english = input.locale === "en";
  const copy = english ? {
    language: "en",
    title: "ArcSweep account connected",
    heading: "Authorization approved.",
    body: "Return to ArcSweep to finish connecting your account. If Safari asks to open the app, allow it.",
    action: "Open ArcSweep",
  } : {
    language: "zh-CN",
    title: "ArcSweep 账号授权成功",
    heading: "授权已确认。",
    body: "返回 ArcSweep 完成账号连接。如果 Safari 询问是否打开应用，请允许。",
    action: "打开 ArcSweep",
  };

  return `<!doctype html>
<html lang="${copy.language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="referrer" content="no-referrer">
  <title>${copy.title}</title>
  <style>
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#fbfafd;color:#201b27;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}.panel{width:min(100%,520px);padding:36px 0;border-top:2px solid #694c91;border-bottom:1px solid #e9e5ed}h1{margin:0;font-size:clamp(24px,5vw,34px);line-height:1.25;letter-spacing:-.035em}p{color:#6d6674;font-size:15px;line-height:1.7}.action{display:inline-flex;align-items:center;justify-content:center;min-height:46px;margin-top:12px;padding:0 18px;border-radius:8px;background:#694c91;color:#fff;font-size:14px;font-weight:650;text-decoration:none}.action:focus-visible{outline:3px solid #a989d4;outline-offset:3px}
  </style>
</head>
<body><main class="panel"><h1>${copy.heading}</h1><p>${copy.body}</p><a class="action" rel="noreferrer" href="${escapeHTML(callback.toString())}">${copy.action}</a></main></body>
</html>`;
}

type AuthorizationFailureInput = {
  locale: AuthorizationLocale;
  diagnosticID: string;
  errorCode: string;
  state?: string;
};

/** A safe, human-readable recovery page for failures after consent. */
export function renderAuthorizationFailurePage(input: AuthorizationFailureInput): string {
  const english = input.locale === "en";
  const diagnosticID = /^[A-F0-9]{8}$/.test(input.diagnosticID) ? input.diagnosticID : "UNKNOWN";
  let returnURL: string | null = null;
  if (input.state && /^[A-Za-z0-9_-]{32,128}$/.test(input.state)) {
    const callback = new URL("arcsweep://oauth/callback");
    const callbackError = input.errorCode === "authentication_required"
      ? "login_required"
      : input.errorCode === "invalid_request" || input.errorCode === "forbidden"
        ? "invalid_request"
        : "temporarily_unavailable";
    callback.searchParams.set("error", callbackError);
    callback.searchParams.set("state", input.state);
    if (callbackError === "temporarily_unavailable" && /^[A-F0-9]{8}$/.test(diagnosticID)) {
      callback.searchParams.set("diagnostic_id", diagnosticID);
    }
    returnURL = callback.toString();
  }
  const expired = input.errorCode === "authentication_required";
  const invalid = input.errorCode === "invalid_request" || input.errorCode === "forbidden";
  const copy = english ? {
    title: expired ? "Sign in again to ArcSweep" : "ArcSweep connection could not be completed",
    heading: expired ? "Your Arc account sign-in has expired." : invalid ? "This authorization request is no longer valid." : "We couldn’t finish connecting your Arc account.",
    body: expired
      ? "Return to ArcSweep, sign in to your Arc account, and connect again."
      : invalid
        ? "Return to ArcSweep and start a new connection request."
        : "Your local scan and files were not changed. Return to ArcSweep and try connecting again.",
    action: "Return to ArcSweep",
    close: "You can close this page and return to ArcSweep.",
    reference: "Support reference",
  } : {
    title: expired ? "请重新登录 Arc 账号" : "ArcSweep 连接未完成",
    heading: expired ? "Arc 账号登录状态已失效。" : invalid ? "这次授权请求已失效。" : "暂时无法完成 Arc 账号连接。",
    body: expired
      ? "请返回 ArcSweep，重新登录 Arc 账号后再连接。"
      : invalid
        ? "请返回 ArcSweep，重新发起账号连接。"
        : "本机扫描和文件未受影响。请返回 ArcSweep 后重试连接。",
    action: "返回 ArcSweep",
    close: "可以关闭此页并返回 ArcSweep。",
    reference: "诊断编号",
  };
  const action = returnURL
    ? `<a class="action" href="${escapeHTML(returnURL)}">${copy.action}</a>`
    : `<p class="close">${copy.close}</p>`;

  return `<!doctype html>
<html lang="${english ? "en" : "zh-CN"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${copy.title}</title>
  <style>
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#fbfafd;color:#201b27;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}.panel{width:min(100%,520px);padding:36px 0;border-top:2px solid #694c91;border-bottom:1px solid #e9e5ed}h1{margin:0;font-size:clamp(24px,5vw,34px);line-height:1.25;letter-spacing:-.035em}p{color:#6d6674;font-size:15px;line-height:1.7}.action{display:inline-flex;align-items:center;justify-content:center;min-height:46px;margin-top:12px;padding:0 18px;border-radius:8px;background:#694c91;color:#fff;font-size:14px;font-weight:650;text-decoration:none}.action:focus-visible{outline:3px solid #a989d4;outline-offset:3px}.reference{margin-top:28px;padding-top:14px;border-top:1px solid #e9e5ed;font-size:12px}.reference code{margin-left:8px;font-variant-numeric:tabular-nums;letter-spacing:.08em}
  </style>
</head>
<body><main class="panel"><h1>${copy.heading}</h1><p>${copy.body}</p>${action}<p class="reference">${copy.reference}<code>${diagnosticID}</code></p></main></body>
</html>`;
}
