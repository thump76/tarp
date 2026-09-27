import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/email";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/me", "/api", "/signup/complete", "/login"] },
    sitemap: siteUrl("/sitemap.xml"),
  };
}
