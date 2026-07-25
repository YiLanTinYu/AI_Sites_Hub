#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const reportsDir = path.join(root, "reports");
const webhookUrl = process.env.DEAL_WEBHOOK_URL?.trim();
const serverChanSendKey = process.env.SERVERCHAN_SENDKEY?.trim();

if (!webhookUrl && !serverChanSendKey) {
  console.log("未配置 DEAL_WEBHOOK_URL 或 SERVERCHAN_SENDKEY，跳过通知。");
  process.exit(0);
}

let parsedUrl = null;
if (webhookUrl) {
  try {
    parsedUrl = new URL(webhookUrl);
  } catch {
    throw new Error("DEAL_WEBHOOK_URL 不是有效 URL");
  }
  if (parsedUrl.protocol !== "https:") {
    throw new Error("DEAL_WEBHOOK_URL 必须使用 HTTPS");
  }
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
const title = `惠选AI优惠线索：变化${summary.changed} 异常${summary.failed} 临期${summary.expiring}`;
const markdown = [
  `# ${title}`,
  "",
  `- 报告：${latestName}`,
  `- 页面发生变化：${summary.changed}`,
  `- 访问异常：${summary.failed}`,
  `- 7 天内结束：${summary.expiring}`,
  `- 已到期记录：${summary.expired}`,
  "",
  "请打开 GitHub Actions 下载中文报告并人工核查后再更新网站。",
  "",
  excerpt,
].join("\n");

if (parsedUrl) {
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
}

if (serverChanSendKey) {
  const serverChanTurboMatch = serverChanSendKey.match(/^sctp(\d+)t/);
  if (serverChanSendKey.startsWith("sctp") && !serverChanTurboMatch) {
    throw new Error("SERVERCHAN_SENDKEY 格式不正确，新版 SendKey 应类似 sctp...t...");
  }
  const endpoint = serverChanTurboMatch
    ? `https://${serverChanTurboMatch[1]}.push.ft07.com/send/${serverChanSendKey}.send`
    : `https://sctapi.ftqq.com/${serverChanSendKey}.send`;
  const body = new URLSearchParams({ title, desp: markdown });
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": "AI-Sites-Hub-Deal-Notifier/1.0",
    },
    body,
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.code !== 0) {
    throw new Error(`Server酱通知失败：HTTP ${response.status} ${JSON.stringify(result)}`);
  }
  console.log(`Server酱微信通知发送成功：${latestName}`);
}
