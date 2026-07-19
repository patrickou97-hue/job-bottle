import type { MetadataRoute } from "next";
import { fetchActiveJobs } from "@/lib/jobs";
import { isJobOpenForSearch, SITE_URL } from "@/lib/seo";
import { createPublicServerClient } from "@/lib/supabase/public-server";

export const revalidate = 3600;

const PUBLIC_ROUTES = [
  { path: "", priority: 1, changeFrequency: "weekly" as const },
  { path: "/explore", priority: 0.9, changeFrequency: "daily" as const },
  { path: "/forum", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/guide", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/extension", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/extension/guide", priority: 0.6, changeFrequency: "monthly" as const },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const supabase = createPublicServerClient();
  const jobs = await fetchActiveJobs(supabase);

  const pages: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const jobPages: MetadataRoute.Sitemap = jobs
    .filter((job) => isJobOpenForSearch(job, now.getTime()))
    .map((job) => ({
      url: `${SITE_URL}/jobs/${job.id}`,
      lastModified: new Date(job.updated_at),
      changeFrequency: "daily",
      priority: 0.8,
    }));

  return [...pages, ...jobPages];
}
