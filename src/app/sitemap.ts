import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/email";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl("/"), changeFrequency: "monthly", priority: 1 },
    { url: siteUrl("/pricing"), changeFrequency: "monthly", priority: 0.9 },
    { url: siteUrl("/markets"), changeFrequency: "weekly", priority: 0.5 },
  ];
}
