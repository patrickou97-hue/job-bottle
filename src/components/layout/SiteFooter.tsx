import Image from "next/image";
import Link from "next/link";

const FOOTER_GROUPS = [
  {
    title: "探索",
    links: [
      { label: "岗位坐标", href: "/explore" },
      { label: "投递管理", href: "/my" },
      { label: "星瓶回顾", href: "/bottle" },
    ],
  },
  {
    title: "制作",
    links: [
      { label: "简历制作", href: "/resume" },
      { label: "网申助手", href: "/extension" },
      { label: "秋招流程", href: "/guide" },
    ],
  },
  {
    title: "连接",
    links: [
      { label: "拾星指南", href: "/forum" },
      { label: "个人中心", href: "/profile" },
      { label: "反馈建议", href: "/feedback" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer" aria-label="网站页脚">
      <div className="site-footer__inner">
        <div className="site-footer__grid">
          <div className="site-footer__brand">
            <Link href="/" aria-label="返回拾星主页" className="inline-flex">
              <Image
                src="/brand/shi-xing-wordmark.png"
                alt="拾星 StarJob"
                width={176}
                height={78}
                className="site-footer__logo brand-wordmark"
              />
            </Link>
            <p>把岗位、简历与每一步进展，收进一个清晰的求职工作台。</p>
          </div>

          <nav className="site-footer__links" aria-label="页脚导航">
            {FOOTER_GROUPS.map((group) => (
              <div key={group.title}>
                <h2>{group.title}</h2>
                <ul>
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="site-footer__bottom">
          <span>© 2026 拾星 StarJob</span>
          <span>用星瓶收录明日坐标</span>
        </div>
      </div>
    </footer>
  );
}
