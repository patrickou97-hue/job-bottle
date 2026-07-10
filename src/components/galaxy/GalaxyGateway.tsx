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
          description="按北京、上海、深圳等城市星云聚合岗位，适合先确定工作地点。"
          imageSrc="/assets/nebula/nebula-region.png"
          tone="rgba(112,154,205,0.28)"
        />
        <GalaxyChoice
          href="/galaxy/industry"
          title="行业星系"
          description="按互联网、金融、咨询、科技等行业星云聚合岗位，适合先确定方向。"
          imageSrc="/assets/nebula/nebula-industry.png"
          tone="rgba(108,176,198,0.24)"
        />
      </section>
    </div>
  );
}
