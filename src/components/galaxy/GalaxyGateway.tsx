import { GalaxyChoice } from "@/components/galaxy/GalaxyChoice";

export function GalaxyGateway() {
  return (
    <div className="observatory-page space-y-8">
      <section className="page-hero">
        <div>
          <p className="page-kicker">探索入口</p>
          <h1 className="page-title">岗位星系</h1>
        </div>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <GalaxyChoice
          href="/galaxy/region"
          title="地区星系"
          description="从城市出发，查看北京、上海、深圳等地的校招机会，适合已经明确工作地点的你。"
          imageSrc="/assets/nebula/nebula-region.png"
          tone="rgba(126,124,181,0.3)"
        />
        <GalaxyChoice
          href="/galaxy/industry"
          title="行业星系"
          description="从方向出发，查看金融、互联网、咨询、科技等行业机会，适合仍在比较职业路径的你。"
          imageSrc="/assets/nebula/nebula-industry.png"
          tone="rgba(127,85,104,0.28)"
        />
      </section>
    </div>
  );
}
