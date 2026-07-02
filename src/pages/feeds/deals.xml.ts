import type { APIRoute } from "astro";
import { publishedDealRows } from "../../lib/data";

export const prerender = true;

const siteUrl = "https://github.com/YiLanTinYu/AI_Sites_Hub";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export const GET: APIRoute = () => {
  const updated =
    [...publishedDealRows].map((deal) => deal.verifiedAt).sort().at(-1) ??
    new Date().toISOString().slice(0, 10);
  const entries = [...publishedDealRows]
    .sort((a, b) => b.verifiedAt.localeCompare(a.verifiedAt))
    .map(
      (deal) => `
  <entry>
    <id>urn:ai-sites-hub:deal:${escapeXml(deal.id)}</id>
    <title>${escapeXml(deal.title)}</title>
    <updated>${deal.verifiedAt}T00:00:00+08:00</updated>
    <link href="${escapeXml(deal.sourceUrl)}"/>
    <summary>${escapeXml(`${deal.benefit}。${deal.summary}`)}</summary>
  </entry>`,
    )
    .join("");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>urn:ai-sites-hub:deals</id>
  <title>惠选AI优惠更新</title>
  <updated>${updated}T00:00:00+08:00</updated>
  <link href="${siteUrl}"/>
  <link href="${siteUrl}/feeds/deals.xml" rel="self" type="application/atom+xml"/>${entries}
</feed>
`,
    { headers: { "content-type": "application/atom+xml; charset=utf-8" } },
  );
};
