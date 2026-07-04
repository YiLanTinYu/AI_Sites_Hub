#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dataDir = path.join(root, "src", "data");
const reportsDir = path.join(root, "reports");
const snapshotPath = path.join(reportsDir, "market-snapshots.json");
const timeoutMs = Number(process.env.MARKET_MONITOR_TIMEOUT_MS || 20000);
const staleDays = Number(process.env.MARKET_MONITOR_STALE_DAYS || 30);

const [providers, models, prices, plans] = await Promise.all(
  ["providers.json", "models.json", "prices.json", "plans.json"].map(async (name) =>
    JSON.parse(await readFile(path.join(dataDir, name), "utf8")),
  ),
);

const providerById = new Map(providers.map((provider) => [provider.id, provider]));
const modelById = new Map(models.map((model) => [model.id, model]));

function sourceGroups() {
  const groups = new Map();

  function add(url, item) {
    const normalizedUrl = new URL(url);
    normalizedUrl.hash = "";
    if (normalizedUrl.pathname !== "/") {
      normalizedUrl.pathname = normalizedUrl.pathname.replace(/\/+$/, "");
    }
    const sourceUrl = normalizedUrl.toString();
    const group = groups.get(sourceUrl) ?? {
      url: sourceUrl,
      providers: new Set(),
      records: [],
      keywords: new Set(["pricing", "price", "plan", "套餐", "价格", "定价"]),
    };
    group.providers.add(item.provider);
    group.records.push(item);
    group.keywords.add(item.name);
    group.keywords.add(item.provider);
    groups.set(sourceUrl, group);
  }

  for (const price of prices) {
    const model = modelById.get(price.modelId);
    const provider = providerById.get(model?.providerId);
    add(price.sourceUrl, {
      kind: "api",
      id: price.id,
      name: model?.name ?? price.modelId,
      provider: provider?.name ?? model?.providerId ?? "未知厂商",
      verifiedAt: price.verifiedAt,
      signals: [
        `${price.currency} ${price.input}`,
        `${price.currency} ${price.output}`,
        price.cachedInput === null ? null : `${price.currency} ${price.cachedInput}`,
      ].filter(Boolean),
    });
  }

  for (const plan of plans) {
    const provider = providerById.get(plan.providerId);
    add(plan.sourceUrl, {
      kind: "plan",
      id: plan.id,
      name: plan.name,
      provider: provider?.name ?? plan.providerId,
      verifiedAt: plan.verifiedAt,
      signals: [
        plan.monthlyPrice === null ? null : `${plan.currency} ${plan.monthlyPrice}`,
        plan.annualPrice === null ? null : `${plan.currency} ${plan.annualPrice}`,
      ].filter(Boolean),
    });
  }

  return [...groups.values()].map((group) => ({
    ...group,
    providers: [...group.providers].sort(),
    keywords: [...group.keywords].filter((keyword) => keyword.length >= 2),
  }));
}

function normalizeText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function relevantExcerpt(text, keywords) {
  const lower = text.toLowerCase();
  const positions = keywords
    .map((keyword) => lower.indexOf(keyword.toLowerCase()))
    .filter((position) => position >= 0)
    .slice(0, 12);
  const snippets = positions.map((position) =>
    text.slice(Math.max(0, position - 220), Math.min(text.length, position + 620)),
  );
  return [...new Set(snippets)].join(" … ").slice(0, 7000) || text.slice(0, 1800);
}

function pricingEvidence(text) {
  const matches = text.match(
    /.{0,90}(?:[$¥€£]\s?\d[\d,.]*|\d[\d,.]*\s*(?:USD|CNY|RMB|美元|人民币|元\/月|\/月|per month|monthly)).{0,130}/giu,
  );
  if (!matches) return "";
  return [...new Set(matches.map((match) => match.replace(/\s+/g, " ").trim()))]
    .sort((a, b) => a.localeCompare(b))
    .join("\n")
    .slice(0, 12000);
}

function fingerprint(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function fetchSource(source) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(source.url, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
        "user-agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    const body = await response.text();
    const text = normalizeText(body);
    const excerpt = relevantExcerpt(text, source.keywords);
    const evidence = pricingEvidence(text);
    return {
      ...source,
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      fingerprint: evidence ? fingerprint(evidence) : null,
      excerpt,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ...source,
      ok: false,
      status: null,
      finalUrl: source.url,
      fingerprint: null,
      excerpt: "",
      checkedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function mapWithConcurrency(items, limit, task) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await task(items[index]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

function daysSince(date) {
  return Math.floor((Date.now() - new Date(`${date}T00:00:00Z`).getTime()) / 86_400_000);
}

await mkdir(reportsDir, { recursive: true });

let previous = {};
try {
  previous = JSON.parse(await readFile(snapshotPath, "utf8"));
} catch {
  previous = {};
}

const sources = sourceGroups();
const results = await mapWithConcurrency(sources, 5, fetchSource);
const changed = results.filter(
  (result) =>
    result.ok &&
    result.fingerprint &&
    previous[result.url]?.fingerprint &&
    previous[result.url].fingerprint !== result.fingerprint,
);
const firstSeen = results.filter(
  (result) =>
    result.ok && result.fingerprint && !previous[result.url]?.fingerprint,
);
const failed = results.filter((result) => !result.ok);
const staleRecords = [...prices, ...plans]
  .filter((record) => daysSince(record.verifiedAt) > staleDays)
  .sort((a, b) => a.verifiedAt.localeCompare(b.verifiedAt));

const nextSnapshots = {
  ...previous,
  ...Object.fromEntries(
    results
      .filter((result) => result.ok && result.fingerprint)
      .map((result) => [
        result.url,
        {
          fingerprint: result.fingerprint,
          checkedAt: result.checkedAt,
          finalUrl: result.finalUrl,
          status: result.status,
        },
      ]),
  ),
};

const today = new Date().toISOString().slice(0, 10);
const report = [
  `# AI 价格与套餐监测报告 · ${today}`,
  "",
  "> 自动化只发现候选变化，不会修改 `prices.json`、`plans.json` 或发布页面。所有变化必须回到官方来源人工核实。",
  "",
  "## 摘要",
  "",
  `- 官方来源页面：${sources.length}`,
  `- API 价格记录：${prices.length}`,
  `- 订阅套餐记录：${plans.length}`,
  `- 页面发生变化：${changed.length}`,
  `- 首次建立快照：${firstSeen.length}`,
  `- 访问异常：${failed.length}`,
  `- 超过 ${staleDays} 天未人工复核：${staleRecords.length}`,
  "",
  "## 需要人工复核的页面变化",
  "",
  ...(changed.length === 0
    ? ["暂无。"]
    : [
        "| 厂商 | 影响记录 | 官方来源 | 核查结果 | 官方最新内容 | 是否更新网站 |",
        "| --- | --- | --- | --- | --- | --- |",
        ...changed.map(
          (source) =>
            `| ${source.providers.join(" / ")} | ${source.records.map((record) => `${record.kind === "api" ? "API" : "套餐"} · ${record.name}`).join("；")} | [打开页面](${source.finalUrl}) | 待核查 |  |  |`,
        ),
      ]),
  "",
  "## 首次建立快照",
  "",
  ...(firstSeen.length === 0
    ? ["暂无。"]
    : firstSeen.map(
        (source) =>
          `- ${source.providers.join(" / ")}：${source.records.length} 条记录 · ${source.finalUrl}`,
      )),
  "",
  "## 访问异常",
  "",
  ...(failed.length === 0
    ? ["暂无。"]
    : [
        "| 厂商 | 异常情况 | 官方来源 | 人工访问结果 | 备注 |",
        "| --- | --- | --- | --- | --- |",
        ...failed.map(
          (source) =>
            `| ${source.providers.join(" / ")} | ${source.status ?? source.error ?? "请求失败"} | [打开页面](${source.url}) | 待核查 |  |`,
        ),
      ]),
  "",
  "## 固定人工核查",
  "",
  "- Google Gemini API 定价：https://ai.google.dev/gemini-api/docs/pricing",
  "- Perplexity Pro 套餐：https://www.perplexity.ai/pro",
  "- Midjourney 套餐：https://docs.midjourney.com/hc/en-us/articles/27870484040333-Comparing-Midjourney-Plans",
  "- 核查频率与记录：见仓库根目录 `人工核查.md`。",
  "",
  `## 超过 ${staleDays} 天未人工复核`,
  "",
  ...(staleRecords.length === 0
    ? ["暂无。"]
    : staleRecords.map(
        (record) =>
          `- ${record.id}：最后核实 ${record.verifiedAt} · ${record.sourceUrl}`,
      )),
  "",
].join("\n");

await writeFile(path.join(reportsDir, `market-monitor-${today}.md`), report, "utf8");
await writeFile(snapshotPath, `${JSON.stringify(nextSnapshots, null, 2)}\n`, "utf8");

console.log(`价格与套餐监测完成：${sources.length} 个来源`);
console.log(
  `变化 ${changed.length}，首次快照 ${firstSeen.length}，异常 ${failed.length}，逾期复核 ${staleRecords.length}`,
);
