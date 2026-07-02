import type { APIRoute } from "astro";
import { models, priceHistory, providers } from "../../lib/data";

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
  const modelMap = new Map(models.map((model) => [model.id, model]));
  const providerMap = new Map(providers.map((provider) => [provider.id, provider]));
  const sorted = [...priceHistory].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  const updated = sorted[0]?.recordedAt ?? new Date().toISOString().slice(0, 10);
  const entries = sorted
    .map((entry) => {
      const model = modelMap.get(entry.modelId);
      const provider = model ? providerMap.get(model.providerId) : undefined;
      const symbol = entry.currency === "CNY" ? "¥" : "$";
      return `
  <entry>
    <id>urn:ai-sites-hub:price:${escapeXml(entry.id)}</id>
    <title>${escapeXml(`${provider?.name ?? ""} ${model?.name ?? entry.modelId}`.trim())}</title>
    <updated>${entry.recordedAt}T00:00:00+08:00</updated>
    <link href="${siteUrl}/models/${escapeXml(entry.modelId)}/"/>
    <summary>${escapeXml(`发送内容 ${symbol}${entry.input}，生成内容 ${symbol}${entry.output} / 100 万个文本单位`)}</summary>
  </entry>`;
    })
    .join("");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>urn:ai-sites-hub:price-updates</id>
  <title>惠选AI价格更新</title>
  <updated>${updated}T00:00:00+08:00</updated>
  <link href="${siteUrl}"/>
  <link href="${siteUrl}/feeds/updates.xml" rel="self" type="application/atom+xml"/>${entries}
</feed>
`,
    { headers: { "content-type": "application/atom+xml; charset=utf-8" } },
  );
};
