import type { APIRoute } from "astro";
import { directoryCategories, models } from "../lib/data";

const siteUrl = "https://ai-sites-hub.pages.dev";
const staticPaths = [
  "/",
  "/plans/",
  "/models/",
  "/deals/",
  "/recommendations/",
  "/calculator/",
  "/updates/",
  "/watchlist/",
  "/search/",
  "/submit/",
  "/methodology/",
  "/privacy/",
];

const escapeXml = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export const GET: APIRoute = () => {
  const paths = [
    ...staticPaths,
    ...directoryCategories.map((category) => `/directory/${category.id}/`),
    ...models.map((model) => `/models/${model.id}/`),
  ];
  const urls = paths
    .map((path) => `  <url><loc>${escapeXml(new URL(path, siteUrl).href)}</loc></url>`)
    .join("\n");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { "content-type": "application/xml; charset=utf-8" } },
  );
};
