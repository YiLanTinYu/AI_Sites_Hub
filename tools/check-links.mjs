#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourceFiles = ["index.html", "section.html", "search.html"];
const dataFiles = [
  "src/data/deal-sources.json",
  "src/data/deals.json",
  "src/data/directory-items.json",
  "src/data/plans.json",
  "src/data/prices.json",
  "src/data/providers.json",
];
const outputDir = path.join(root, "reports");
const timeoutMs = Number(process.env.LINK_CHECK_TIMEOUT_MS || 12000);
const concurrency = Number(process.env.LINK_CHECK_CONCURRENCY || 8);

function normalizeUrl(raw) {
  const value = raw.trim();
  if (!value || value.startsWith("#")) return null;
  if (value.startsWith("mailto:") || value.startsWith("tel:") || value.startsWith("javascript:")) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return null;
}

async function extractLinks() {
  const links = [];

  for (const file of sourceFiles) {
    const html = await readFile(path.join(root, file), "utf8");
    const matches = html.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi);

    for (const match of matches) {
      const url = normalizeUrl(match[1]);
      if (url) links.push({ file, url });
    }
  }

  for (const file of dataFiles) {
    const data = JSON.parse(await readFile(path.join(root, file), "utf8"));
    const values = [];

    function visit(value) {
      if (typeof value === "string") {
        values.push(value);
        return;
      }
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }
      if (value && typeof value === "object") {
        Object.values(value).forEach(visit);
      }
    }

    visit(data);
    for (const value of values) {
      const url = normalizeUrl(value);
      if (url) links.push({ file, url });
    }
  }

  const byUrl = new Map();
  for (const item of links) {
    const existing = byUrl.get(item.url);
    if (existing) existing.files.add(item.file);
    else byUrl.set(item.url, { url: item.url, files: new Set([item.file]) });
  }

  return [...byUrl.values()].map((item) => ({
    url: item.url,
    files: [...item.files].sort(),
  }));
}

async function requestWithTimeout(url, method) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "sites-hub-link-checker/1.0",
      },
    });

    return {
      finalUrl: response.url,
      ok: response.status >= 200 && response.status < 400,
      status: response.status,
      statusText: response.statusText,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function checkLink(item) {
  const started = Date.now();

  try {
    let result = await requestWithTimeout(item.url, "HEAD");

    if ([403, 405, 406, 501].includes(result.status)) {
      result = await requestWithTimeout(item.url, "GET");
    }

    return {
      ...item,
      ...result,
      durationMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ...item,
      ok: false,
      status: null,
      statusText: error.name === "AbortError" ? "Timeout" : error.message,
      finalUrl: null,
      durationMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
    };
  }
}

async function mapConcurrent(items, limit, worker) {
  const results = [];
  let index = 0;

  async function run() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current], current);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

function statusLabel(result) {
  if (result.ok) return "OK";
  if ([401, 403, 429].includes(result.status)) return "BLOCKED";
  if ([404, 410].includes(result.status)) return "BROKEN";
  if (result.status === 567) return "WARN";
  if (result.status && result.status >= 500) return "SERVER";
  if (result.status === null && result.statusText === "Timeout") return "TIMEOUT";
  if (result.status === null) return "ERROR";
  return "WARN";
}

function shouldFail(result) {
  return ["BROKEN", "SERVER"].includes(statusLabel(result));
}

function renderMarkdown(results) {
  const ok = results.filter((item) => statusLabel(item) === "OK");
  const blocked = results.filter((item) => statusLabel(item) === "BLOCKED");
  const failed = results.filter((item) => shouldFail(item));
  const warned = results.filter(
    (item) =>
      !item.ok &&
      !shouldFail(item) &&
      statusLabel(item) !== "BLOCKED",
  );
  const now = new Date().toISOString();

  const lines = [
    "# 全站外部链接巡检报告",
    "",
    `- 检查时间：${now}`,
    `- 外部链接总数：${results.length}`,
    `- 正常：${ok.length}`,
    `- 被登录或反爬保护拦截：${blocked.length}`,
    `- 超时及其他警告：${warned.length}`,
    `- 确定需要处理：${failed.length}`,
    "",
  ];

  if (failed.length) {
    lines.push("## 确定需要处理", "");
    lines.push("| 状态码 | 链接 | 所在数据文件 | 具体情况 |");
    lines.push("| --- | --- | --- | --- |");
    for (const item of failed) {
      lines.push(`| ${item.status ?? "请求错误"} | [打开链接](${item.url}) | ${item.files.join(", ")} | ${item.statusText || ""} |`);
    }
    lines.push("");
  } else {
    lines.push("## 确定需要处理", "", "暂无。", "");
  }

  if (blocked.length) {
    lines.push("## 需要人工打开确认", "");
    lines.push("这些链接返回 401、403 或 429，通常是登录要求或反爬保护，不能直接判定为失效。");
    lines.push("");
    lines.push("| 状态码 | 链接 | 所在数据文件 | 具体情况 |");
    lines.push("| --- | --- | --- | --- |");
    for (const item of blocked) {
      lines.push(`| ${item.status ?? "请求错误"} | [打开链接](${item.url}) | ${item.files.join(", ")} | ${item.statusText || ""} |`);
    }
    lines.push("");
  }

  if (warned.length) {
    lines.push("## 超时与临时异常", "");
    lines.push("这些链接本次未能稳定访问，但证据不足以认定失效，等待下次自动复查。", "");
    lines.push("| 结果 | 链接 | 所在数据文件 | 具体情况 |");
    lines.push("| --- | --- | --- | --- |");
    for (const item of warned) {
      lines.push(`| ${statusLabel(item)} | [打开链接](${item.url}) | ${item.files.join(", ")} | ${item.statusText || ""} |`);
    }
    lines.push("");
  }

  lines.push("完整检查结果保存在同次运行的 `link-check.json` 附件中。", "");

  return `${lines.join("\n")}\n`;
}

async function main() {
  const links = await extractLinks();
  console.log(`Checking ${links.length} unique external links...`);

  const results = await mapConcurrent(links, concurrency, async (item, index) => {
    const result = await checkLink(item);
    const number = String(index + 1).padStart(String(links.length).length, " ");
    console.log(`[${number}/${links.length}] ${statusLabel(result)} ${result.status ?? ""} ${item.url}`);
    return result;
  });

  results.sort((a, b) => Number(a.ok) - Number(b.ok) || a.url.localeCompare(b.url));
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "link-check.json"), JSON.stringify(results, null, 2));
  await writeFile(path.join(outputDir, "link-check.md"), renderMarkdown(results));

  const failed = results.filter((item) => shouldFail(item));
  console.log("");
  console.log(`Done. ${results.length} checked, ${failed.length} failed.`);
  console.log(`Reports: ${path.relative(root, path.join(outputDir, "link-check.md"))}`);

  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
