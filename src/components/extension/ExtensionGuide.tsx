"use client";

import Link from "next/link";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  BrowserIcon,
  CheckCircleIcon,
  FolderOpenIcon,
  PuzzlePieceIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";

const INSTALL_ACTIONS = [
  {
    icon: ArrowDownIcon,
    title: "下载并解压 ZIP",
    body: "下载拾星网申助手后完整解压。不要直接在压缩包预览窗口中安装，也不要只解压 manifest.json。",
  },
  {
    icon: BrowserIcon,
    title: "打开扩展管理页",
    body: "Chrome 输入 chrome://extensions，Edge 输入 edge://extensions，然后打开右上角的开发者模式。",
  },
  {
    icon: FolderOpenIcon,
    title: "加载已解压的扩展",
    body: "选择“加载已解压的扩展程序”，打开刚才解压得到的 starjob-resume-assistant 文件夹。",
  },
  {
    icon: PuzzlePieceIcon,
    title: "固定拾星图标",
    body: "在浏览器工具栏的扩展菜单中找到拾星网申助手并固定，后续填写网申时可以直接打开。",
  },
];

export function ExtensionGuide() {
  return (
    <div className="observatory-page extension-guide space-y-14">
      <section className="page-hero border-b border-[color:var(--line-ghost)] pb-8">
        <div>
          <h1 className="page-title">安装拾星网申助手</h1>
          <p className="page-subtitle mt-4">完成一次安装和简历同步，之后在网申页打开扩展即可填写。</p>
        </div>
        <a href="https://pan.baidu.com/s/10QoSAiNpFOch881oCniEjA?pwd=SXZS" target="_blank" rel="noreferrer" className="gold-button pressable inline-flex h-11 w-fit items-center gap-2 rounded-lg px-4 text-sm font-semibold">
          <ArrowDownIcon aria-hidden="true" className="size-4" />
          获取安装包
        </a>
        <p className="mt-3 text-xs leading-6 text-ink-muted">百度网盘提取码：SXZS</p>
      </section>

      <section className="grid gap-x-10 gap-y-8 md:grid-cols-2">
        {INSTALL_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <article key={action.title} className="border-t border-[color:var(--line-ghost)] pt-5">
              <Icon aria-hidden="true" className="size-6 text-[color:var(--aurora)]" />
              <h2 className="mt-4 text-lg font-semibold text-ink-primary">{action.title}</h2>
              <p className="mt-2 max-w-[48ch] text-sm leading-7 text-ink-secondary">{action.body}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-8 border-y border-[color:var(--line-ghost)] py-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(360px,1.15fr)]">
        <div>
          <UploadSimpleIcon aria-hidden="true" className="size-7 text-[color:var(--aurora)]" />
          <h2 className="mt-4 text-2xl font-semibold text-ink-primary">同步简历</h2>
          <p className="mt-3 max-w-[48ch] text-sm leading-7 text-ink-secondary">安装完成后返回助手页，登录拾星并点击“同步到扩展”。每次修改云端简历后重新同步即可。</p>
          <Link href="/extension#sync" className="text-action mt-5 h-10 text-sm font-semibold">
            前往同步
            <ArrowRightIcon aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <div className="extension-guide__checklist">
          {["打开企业网申填写页面", "点击浏览器工具栏中的拾星图标", "选择简历和填写方式", "点击填写当前页面", "检查标记字段并手动提交"].map((item) => (
            <div key={item} className="flex items-start gap-3 py-3">
              <CheckCircleIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[color:var(--ok)]" weight="fill" />
              <span className="text-sm leading-6 text-ink-secondary">{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-ink-primary">需要手动处理的内容</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {["附件简历上传", "验证码和测评题", "身份证及敏感声明", "网申最终提交"].map((item) => (
            <div key={item} className="border-t border-[color:var(--line-ghost)] pt-4 text-sm font-medium text-ink-secondary">{item}</div>
          ))}
        </div>
        <p className="mt-6 text-sm leading-7 text-ink-muted">部分网申系统使用封闭组件或频繁变化的页面结构，未识别字段会保持原样。请不要在未检查的情况下提交。</p>
        <p className="mt-2 text-xs leading-6 text-ink-muted">智能分析只接收页面字段的标签、占位符、字段名、控件类型和区块名称，不接收输入框现有值或简历正文；分析失败时会自动回退到本地规则。</p>
      </section>
    </div>
  );
}
