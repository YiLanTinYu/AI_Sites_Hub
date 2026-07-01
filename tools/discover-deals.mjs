#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dataDir = path.join(root, "src", "data");
const reportsDir = path.join(root, "reports");
const snapshotPath = path.join(reportsDir, "deal-snapshots.json");
const timeoutMs = Number(process.env.DEAL_DISCOVERY_TIMEOUT_MS || 15000);

const sources = JSON.parse(
  await readFile(path.join(dataDir, "deal-sources.json"), "utf8"),
);
const deals = JSON.parse(await readFile(path.join(dataDir, "deals.json"), "utf8"));

function normalizeText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function fingerprint(text) {
  return createHash("sha256").update(text).digest("hex");
}

function excerptAroundKeywords(text, keywords) {
  const lower = text.toLowerCase();
  const snippets = keywords
    .map((keyword) => lower.indexOf(keyword.toLowerCase()))
    .filter((position) => position >= 0)
    .map((position) =>
      text.slice(Math.max(0, position - 180), Math.min(text.length, position + 420)),
    );
  return [...new Set(snippets)].join(" … ").slice(0, 2400) || text.slice(0, 900);
}

async function fetchSource(source) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(source.url, {
      headers: { "user-agent": "AI-Sites-Hub-Deal-Monitor/1.0" },
      redirect: "follow",
      signal: controller.signal,
    });
    const body = await response.text();
    const text = normalizeText(body);
    const excerpt = excerptAroundKeywords(text, source.keywords);
    return {
      ...source,
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      fingerprint: fingerprint(excerpt),
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

await mkdir(reportsDir, { recursive: true });

let previous = {};
try {
  previous = JSON.parse(await readFile(snapshotPath, "utf8"));
} catch {
  previous = {};
}

const results = await mapWithConcurrency(sources, 4, fetchSource);
const nextSnapshots = Object.fromEntries(
  results
    .filter((result) => result.fingerprint)
    .map((result) => [
      result.id,
      {
        fingerprint: result.fingerprint,
        checkedAt: result.checkedAt,
        finalUrl: result.finalUrl,
      },
    ]),
);

const today = new Date().toISOString().slice(0, 10);
const changed = results.filter(
  (result) =>
    result.fingerprint &&
    previous[result.id]?.fingerprint &&
    previous[result.id].fingerprint !== result.fingerprint,
);
const firstSeen = results.filter(
  (result) => result.fingerprint && !previous[result.id]?.fingerprint,
);
const failed = results.filter((result) => !result.ok);
const expiring = deals.filter((deal) => {
  if (!deal.endsAt || deal.reviewStatus !== "approved") return false;
  const days = (new Date(`${deal.endsAt}T23:59:59+08:00`) - new Date()) / 86_400_000;
  return days >= 0 && days <= 7;
});
const expired = deals.filter(
  (deal) =>
    deal.endsAt &&
    deal.reviewStatus === "approved" &&
    new Date() > new Date(`${deal.endsAt}T23:59:59+08:00`),
);

const report = [
  `# AI 优惠监测报告 · ${today}`,
  "",
  "> 自动化仅提示变化，不会修改或发布优惠数据。请打开官方来源人工核实后再编辑 `src/data/deals.json`。",
  "",
  "## 摘要",
  "",
  `- 监测来源：${sources.length}`,
  `- 页面发生变化：${changed.length}`,
  `- 首次建立快照：${firstSeen.length}`,
  `- 访问异常：${failed.length}`,
  `- 7 天内结束：${expiring.length}`,
  `- 已到期记录：${expired.length}`,
  "",
  "## 需要人工复核",
  "",
  ...(changed.length === 0
    ? ["暂无已确认的页面变化。"]
    : changed.flatMap((item) => [
        `### ${item.name}`,
        "",
        `- 官方来源：${item.finalUrl}`,
        `- 当前状态：HTTP ${item.status}`,
        `- 变化摘要：页面指纹与上次监测不同，请核实活动日期、优惠力度和限制条件。`,
        "",
        item.excerpt,
        "",
      ])),
  "",
  "## 临近结束",
  "",
  ...(expiring.length === 0
    ? ["暂无。"]
    : expiring.map(
        (deal) => `- ${deal.title}：${deal.endsAt} 截止 · ${deal.sourceUrl}`,
      )),
  "",
  "## 已到期",
  "",
  ...(expired.length === 0
    ? ["暂无。"]
    : expired.map(
        (deal) =>
          `- ${deal.title}：页面会自动归入历史优惠，无需删除数据 · ${deal.sourceUrl}`,
      )),
  "",
  "## 访问异常",
  "",
  ...(failed.length === 0
    ? ["暂无。"]
    : failed.map(
        (item) =>
          `- ${item.name}：${item.status ?? item.error ?? "请求失败"} · ${item.url}`,
      )),
  "",
].join("\n");

const reportPath = path.join(reportsDir, `ai-deals-${today}.md`);
await writeFile(reportPath, report, "utf8");
await writeFile(snapshotPath, `${JSON.stringify(nextSnapshots, null, 2)}\n`, "utf8");

console.log(`优惠监测完成：${reportPath}`);
console.log(
  `变化 ${changed.length}，临近结束 ${expiring.length}，已到期 ${expired.length}，异常 ${failed.length}`,
);
