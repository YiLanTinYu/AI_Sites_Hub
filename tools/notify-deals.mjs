#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const reportsDir = path.join(root, "reports");
const webhookUrl = process.env.DEAL_WEBHOOK_URL?.trim();

if (!webhookUrl) {
  console.log("未配置 DEAL_WEBHOOK_URL，跳过 Webhook 通知。");
  process.exit(0);
}

let parsedUrl;
try {
  parsedUrl = new URL(webhookUrl);
} catch {
  throw new Error("DEAL_WEBHOOK_URL 不是有效 URL");
}
if (parsedUrl.protocol !== "https:") {
  throw new Error("DEAL_WEBHOOK_URL 必须使用 HTTPS");
}

const reports = (await readdir(reportsDir))
  .filter((name) => /^ai-deals-\d{4}-\d{2}-\d{2}\.md$/.test(name))
  .sort();
const latestName = reports.at(-1);
if (!latestName) throw new Error("未找到优惠监测报告，请先运行 npm run discover:deals");

const report = await readFile(path.join(reportsDir, latestName), "utf8");
const numberFor = (label) => {
  const match = report.match(new RegExp(`- ${label}：(\\d+)`));
  return match ? Number(match[1]) : 0;
};
const summary = {
  changed: numberFor("页面发生变化"),
  failed: numberFor("访问异常"),
  expiring: numberFor("7 天内结束"),
  expired: numberFor("已到期记录"),
};

if (summary.changed + summary.failed + summary.expiring + summary.expired === 0) {
  console.log("没有需要提醒的优惠变化，跳过 Webhook 通知。");
  process.exit(0);
}

const excerpt = report.slice(0, 3500);
const response = await fetch(parsedUrl, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "user-agent": "AI-Sites-Hub-Deal-Notifier/1.0",
  },
  body: JSON.stringify({
    event: "ai_sites_hub.deal_monitor",
    generatedAt: new Date().toISOString(),
    report: latestName,
    summary,
    excerpt,
  }),
  signal: AbortSignal.timeout(15000),
});
if (!response.ok) throw new Error(`Webhook 返回 HTTP ${response.status}`);
console.log(`Webhook 通知发送成功：${latestName}`);
