#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outputDir = path.join(root, "reports");
const timeoutMs = Number(process.env.AI_DISCOVERY_TIMEOUT_MS || 14000);
const concurrency = Number(process.env.AI_DISCOVERY_CONCURRENCY || 6);
const maxItemsPerSource = Number(process.env.AI_DISCOVERY_LIMIT || 40);
const daysBack = Number(process.env.AI_DISCOVERY_DAYS || 45);

const aggregatorDomains = new Set([
  "github.com",
  "huggingface.co",
  "news.ycombinator.com",
  "pypi.org",
  "producthunt.com",
  "arxiv.org",
]);

const newsDomains = new Set([
  "reuters.com",
  "bloomberg.com",
  "venturebeat.com",
  "thenextweb.com",
  "wsj.com",
  "ft.com",
  "forbes.com",
  "techcrunch.com",
  "theverge.com",
  "thenewstack.io",
  "fedoramagazine.org",
  "wired.com",
]);

const sectionLabels = {
  global: "国外主流大模型",
  china: "国内主流大模型",
  agents: "对话式 Agent 与综合助手",
  skills: "Skills、智能体与自动化平台",
  research: "AI 搜索、研究与知识工具",
  coding: "AI 编程与开发工具",
  creative: "多模态创作与办公生产力",
};

const aiKeywords = [
  "ai",
  "agent",
  "agents",
  "agentic",
  "automation",
  "autonomous",
  "chatbot",
  "coding",
  "copilot",
  "deep learning",
  "diffusion",
  "foundation model",
  "generative",
  "image generation",
  "large language model",
  "llm",
  "model",
  "multimodal",
  "rag",
  "reasoning",
  "speech",
  "text to video",
  "transformer",
  "voice",
  "workflow",
  "大模型",
  "智能体",
  "模型",
  "生成式",
  "多模态",
];

const negativeKeywords = [
  "crypto",
  "defi",
  "nft",
  "casino",
  "betting",
  "coupon",
  "dating",
];

const lowValuePatterns = [
  /ask hn:/i,
  /show hn:.*(i built|i made|i hand|i hated|fun with|how to|what happens|does anyone|what are your)/i,
  /tutorial|guide|course|courses|beginner|beginners|checklist|awesome|examples?|demo|sample|template|boilerplate/i,
  /war stories|story|opinion|why |how i |how we |future of|worthwhile|unsafe|hijack|worm|fabricated|misunderstanding/i,
  /学习|教程|指南|案例|入门|示例|合集|清单/i,
];

const productSignals = [
  /launch hn:/i,
  /show hn:/i,
  /\.ai\b/i,
  /agent|agentic|automation|workflow|coding agent|mcp|llm|model|search|voice|video|image/i,
];

const openSourceProductSignals = [
  /agent|agentic|workflow|automation|rag|search|studio|platform|browser|memory|copilot|assistant|chat|code|coding|tts|ocr|inference/i,
  /智能体|自动化|平台|助手|知识库|检索|模型|语音|视觉/i,
];

const rssSources = [
  {
    id: "producthunt",
    name: "Product Hunt 新品",
    url: "https://www.producthunt.com/feed",
    type: "新品发现",
  },
  {
    id: "openai-news",
    name: "OpenAI News",
    url: "https://openai.com/news/rss.xml",
    type: "官方动态",
  },
  {
    id: "deepmind-blog",
    name: "Google DeepMind Blog",
    url: "https://deepmind.google/blog/rss.xml",
    type: "官方动态",
  },
  {
    id: "huggingface-blog",
    name: "Hugging Face Blog",
    url: "https://huggingface.co/blog/feed.xml",
    type: "社区动态",
  },
];

const hnQueries = [
  "AI agent",
  "LLM startup",
  "generative AI tool",
  "open source AI model",
  "AI coding agent",
];

const githubQueries = [
  "topic:llm stars:>300",
  "topic:ai-agent stars:>200",
  "topic:generative-ai stars:>300",
  "topic:rag stars:>300",
  "topic:multimodal stars:>200",
];

function unique(values) {
  return [...new Set(values)];
}

function cutoffDate() {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  return date;
}

function isoDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function decodeHtml(value = "") {
  return value
    .replaceAll("<![CDATA[", "")
    .replaceAll("]]>", "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanTitle(value = "") {
  return decodeHtml(value)
    .replace(/\s*\|\s*Product Hunt\s*$/i, "")
    .replace(/\s*-\s*Product Hunt\s*$/i, "")
    .trim();
}

function normalizeUrl(raw) {
  try {
    const url = new URL(raw);
    url.hash = "";
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return null;
  }
}

function normalizedDomain(raw) {
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function textFor(item) {
  return `${item.name || ""} ${item.description || ""} ${item.url || ""}`.toLowerCase();
}

function keywordMatches(item) {
  const text = textFor(item);
  return aiKeywords.filter((keyword) => text.includes(keyword.toLowerCase()));
}

function isLikelyAi(item) {
  const text = textFor(item);
  if (negativeKeywords.some((keyword) => text.includes(keyword))) return false;
  return keywordMatches(item).length > 0;
}

function suggestSection(item) {
  const text = textFor(item);
  if (/(agent|agentic|workflow|automation|bot|智能体|自动化)/i.test(text)) return "skills";
  if (/(search|research|paper|arxiv|citation|knowledge|rag|检索|论文|知识)/i.test(text)) return "research";
  if (/(image|video|audio|voice|speech|design|presentation|creative|multimodal|图像|视频|语音|多模态|创作)/i.test(text)) return "creative";
  if (/(code|coding|developer|ide|copilot|代码|编程)/i.test(text)) return "coding";
  if (/(china|chinese|qwen|deepseek|baidu|tencent|alibaba|bytedance|moonshot|zhipu|kimi|中国|中文|阿里|百度|腾讯|字节|智谱|月之暗面)/i.test(text)) return "china";
  if (/(model|llm|foundation|open source|huggingface|大模型|模型)/i.test(text)) return "global";
  return "agents";
}

function candidateKind(item) {
  const domain = normalizedDomain(item.url);
  if (domain === "github.com") return "开源项目";
  if (domain === "pypi.org") return "开源项目";
  if (domain === "huggingface.co") return "模型/社区条目";
  if (newsDomains.has(domain) || /(blog|news|article|substack)/i.test(item.url)) return "资讯/模型动态";
  if (domain === "news.ycombinator.com" || domain === "producthunt.com") return "社区线索";
  if (item.sourceType === "官方动态" || item.sourceType === "社区动态") return "资讯/模型动态";
  return "产品/厂商候选";
}

function isLowValueLead(item) {
  const text = textFor(item);
  return lowValuePatterns.some((pattern) => pattern.test(text));
}

function hasProductSignal(item) {
  const text = textFor(item);
  return productSignals.some((pattern) => pattern.test(text));
}

function hasOpenSourceProductSignal(item) {
  const text = textFor(item);
  return openSourceProductSignals.some((pattern) => pattern.test(text));
}

function isRootLikeUrl(item) {
  try {
    const url = new URL(item.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    return pathParts.length <= 1;
  } catch {
    return false;
  }
}

function confidenceScore(item) {
  const matches = keywordMatches(item);
  const domain = normalizedDomain(item.url);
  let score = 35 + Math.min(matches.length * 8, 32);

  if (item.sourceType === "新品发现") score += 12;
  if (item.sourceType === "开源趋势") score += 10;
  if (item.sourceType === "模型社区") score += 8;
  if (item.sourceType === "官方动态") score += 4;
  if (item.metrics?.stars) score += Math.min(Math.log10(item.metrics.stars) * 8, 22);
  if (item.metrics?.downloads) score += Math.min(Math.log10(item.metrics.downloads + 1) * 4, 14);
  if (!aggregatorDomains.has(domain)) score += 6;
  if (/(awesome|guide|tutorial|example|examples|beginner|beginners|checklist|course|courses|学习|教程|指南)/i.test(textFor(item))) score -= 22;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function curationFor(item) {
  if (item.alreadyCollected) {
    return {
      tier: "已收录/重复",
      score: 0,
      reason: item.existingMatch || "站内已有相同链接或相同域名",
    };
  }

  const reasons = [];
  let score = item.confidence;

  if (item.kind === "产品/厂商候选") {
    score += 18;
    reasons.push("独立产品或厂商官网线索");
  }

  if (item.kind === "开源项目") {
    const stars = item.metrics.stars || 0;
    if (stars >= 50000) {
      score += 20;
      reasons.push("GitHub stars >= 50k");
    } else if (stars >= 20000) {
      score += 14;
      reasons.push("GitHub stars >= 20k");
    } else if (stars >= 5000) {
      score += 8;
      reasons.push("GitHub stars >= 5k");
    }
    if (hasOpenSourceProductSignal(item)) {
      score += 8;
      reasons.push("看起来是可用工具/平台而非资料集合");
    }
  }

  if (item.kind === "模型/社区条目") {
    const downloads = item.metrics.downloads || 0;
    if (downloads >= 1000000) {
      score += 12;
      reasons.push("模型下载量较高");
    } else if (downloads >= 100000) {
      score += 7;
      reasons.push("模型有一定社区热度");
    }
  }

  if (item.kind === "资讯/模型动态") {
    score -= 35;
    reasons.push("更像新闻/博客/观点，不适合作为导航入口");
  }

  if (item.kind === "社区线索") {
    score -= 25;
    reasons.push("社区讨论页，需找到真实官网后再收录");
  }

  if (hasProductSignal(item)) {
    score += 6;
    reasons.push("标题或链接含产品能力信号");
  }

  if (isRootLikeUrl(item) && item.kind === "产品/厂商候选") {
    score += 6;
    reasons.push("链接接近官网入口");
  }

  if (isLowValueLead(item)) {
    score -= 34;
    reasons.push("教程/新闻/个人经验/资料集合倾向较强");
  }

  if (/news\.ycombinator\.com|reuters\.com|bloomberg\.com|wsj\.com|ft\.com/i.test(item.url)) {
    score -= 18;
    reasons.push("不是产品官网");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let tier = "暂不收录";
  if (score >= 82 && ["产品/厂商候选", "开源项目"].includes(item.kind)) tier = "优先核验";
  else if (score >= 68 && ["产品/厂商候选", "开源项目", "模型/社区条目"].includes(item.kind)) tier = "可考虑收录";
  else if (score >= 48) tier = "观察";

  return {
    tier,
    score,
    reason: reasons.slice(0, 3).join("；") || "相关度一般，建议人工判断",
  };
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "application/rss+xml, application/xml, application/json, text/html;q=0.8",
        "user-agent": "sites-hub-ai-discovery/1.0",
      },
    });

    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url) {
  const text = await fetchText(url);
  return JSON.parse(text);
}

function parseRssItems(xml, source) {
  const blocks = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]);
  return blocks.slice(0, maxItemsPerSource).map((block) => {
    const field = (name) => {
      const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
      return match ? decodeHtml(match[1]) : "";
    };

    const name = cleanTitle(field("title"));
    const url = normalizeUrl(field("link"));
    const description = decodeHtml(field("description") || field("content:encoded")).slice(0, 240);
    const publishedAt = field("pubDate") ? new Date(field("pubDate")).toISOString() : null;

    return {
      name,
      url,
      description,
      publishedAt,
      source: source.name,
      sourceType: source.type,
      sourceUrl: source.url,
    };
  });
}

async function readExistingSites() {
  const html = await readFile(path.join(root, "index.html"), "utf8");
  const sectionTitles = new Map();
  for (const section of html.matchAll(/<div id="([^"]+)" class="section">[\s\S]*?<h2>([\s\S]*?)<\/h2>/g)) {
    sectionTitles.set(section[1], decodeHtml(section[2]));
  }

  const cards = [];
  const cardMatches = html.matchAll(/<article class="model-card"[\s\S]*?<\/article>/g);
  for (const match of cardMatches) {
    const block = match[0];
    const name = decodeHtml(block.match(/<h3>([\s\S]*?)<\/h3>/i)?.[1] || "");
    const url = normalizeUrl(block.match(/\bhref=["']([^"']+)["']/i)?.[1] || "");
    const sectionMatch = html.slice(0, match.index).match(/<div id="([^"]+)" class="section">/g);
    const lastSection = sectionMatch?.at(-1)?.match(/id="([^"]+)"/)?.[1] || "";
    if (name && url) {
      cards.push({
        name,
        url,
        domain: normalizedDomain(url),
        sectionId: lastSection,
        section: sectionTitles.get(lastSection) || lastSection,
      });
    }
  }

  return cards;
}

async function collectRssCandidates() {
  const results = await mapConcurrent(rssSources, concurrency, async (source) => {
    try {
      const xml = await fetchText(source.url);
      return parseRssItems(xml, source);
    } catch (error) {
      return [{ error: error.message, source: source.name, sourceUrl: source.url }];
    }
  });
  return results.flat();
}

async function collectHnCandidates() {
  const since = Math.floor(cutoffDate().getTime() / 1000);
  const results = await mapConcurrent(hnQueries, concurrency, async (query) => {
    const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=story&numericFilters=created_at_i>${since}&hitsPerPage=${maxItemsPerSource}`;
    try {
      const json = await fetchJson(url);
      return (json.hits || []).map((hit) => ({
        name: cleanTitle(hit.title || hit.story_title || ""),
        url: normalizeUrl(hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`),
        description: `HN points: ${hit.points || 0}. Comments: ${hit.num_comments || 0}. Query: ${query}.`,
        publishedAt: hit.created_at || null,
        source: "Hacker News Algolia",
        sourceType: "技术社区",
        sourceUrl: url,
        metrics: {
          points: hit.points || 0,
          comments: hit.num_comments || 0,
        },
      }));
    } catch (error) {
      return [{ error: error.message, source: "Hacker News Algolia", sourceUrl: url }];
    }
  });
  return results.flat();
}

async function collectGithubCandidates() {
  const pushedAfter = isoDateOnly(cutoffDate());
  const results = await mapConcurrent(githubQueries, 2, async (query) => {
    const fullQuery = `${query} pushed:>${pushedAfter}`;
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(fullQuery)}&sort=stars&order=desc&per_page=${Math.min(maxItemsPerSource, 30)}`;
    try {
      const json = await fetchJson(url);
      return (json.items || []).map((repo) => ({
        name: repo.full_name,
        url: normalizeUrl(repo.html_url),
        description: repo.description || "",
        publishedAt: repo.created_at || repo.pushed_at || null,
        source: `GitHub Search: ${query}`,
        sourceType: "开源趋势",
        sourceUrl: url,
        metrics: {
          stars: repo.stargazers_count || 0,
          forks: repo.forks_count || 0,
        },
      }));
    } catch (error) {
      return [{ error: error.message, source: `GitHub Search: ${query}`, sourceUrl: url }];
    }
  });
  return results.flat();
}

async function collectHuggingFaceCandidates() {
  const url = `https://huggingface.co/api/models?sort=downloads&direction=-1&limit=${maxItemsPerSource}`;
  try {
    const json = await fetchJson(url);
    return (json || []).map((model) => ({
      name: model.id,
      url: normalizeUrl(`https://huggingface.co/${model.id}`),
      description: unique([...(model.tags || []), model.pipeline_tag].filter(Boolean)).slice(0, 10).join(", "),
      publishedAt: model.createdAt || model.lastModified || null,
      source: "Hugging Face Popular Models",
      sourceType: "模型社区",
      sourceUrl: url,
      metrics: {
        downloads: model.downloads || 0,
        likes: model.likes || 0,
      },
    }));
  } catch (error) {
    return [{ error: error.message, source: "Hugging Face Popular Models", sourceUrl: url }];
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

function dedupeCandidates(items) {
  const byKey = new Map();

  for (const item of items) {
    if (!item.url || !item.name || !isLikelyAi(item)) continue;
    const domain = normalizedDomain(item.url);
    const key = aggregatorDomains.has(domain) ? item.url.toLowerCase() : domain || item.url.toLowerCase();
    const existing = byKey.get(key);
    if (!existing || confidenceScore(item) > confidenceScore(existing)) byKey.set(key, item);
  }

  return [...byKey.values()];
}

function enrichCandidates(candidates, existingSites) {
  const existingUrls = new Set(existingSites.map((item) => item.url.toLowerCase()));
  const existingDomains = new Map(existingSites.map((item) => [item.domain, item]));

  return candidates.map((item) => {
    const domain = normalizedDomain(item.url);
    const exactCollected = existingUrls.has(item.url.toLowerCase());
    const domainCollected = existingDomains.has(domain) && !aggregatorDomains.has(domain);
    const matched = exactCollected || domainCollected ? existingDomains.get(domain) : null;
    const suggestedSection = suggestSection(item);

    return {
      name: item.name,
      url: item.url,
      domain,
      description: item.description || "",
      publishedAt: item.publishedAt,
      source: item.source,
      sourceType: item.sourceType,
      sourceUrl: item.sourceUrl,
      kind: candidateKind(item),
      suggestedSection,
      suggestedSectionLabel: sectionLabels[suggestedSection],
      confidence: confidenceScore(item),
      alreadyCollected: exactCollected || domainCollected,
      existingMatch: matched ? `${matched.name} / ${matched.section}` : "",
      metrics: item.metrics || {},
      matchedKeywords: keywordMatches(item).slice(0, 8),
    };
  });
}

function withCuration(candidates) {
  return candidates.map((item) => ({
    ...item,
    curation: curationFor(item),
  }));
}

function renderMarkdown(candidates, errors, existingCount) {
  const now = new Date().toISOString();
  const fresh = candidates.filter((item) => !item.alreadyCollected);
  const collected = candidates.filter((item) => item.alreadyCollected);
  const productHigh = fresh.filter((item) => item.kind === "产品/厂商候选" && item.confidence >= 65);
  const openSourceHigh = fresh.filter((item) => item.kind === "开源项目" && item.confidence >= 75);
  const bySection = new Map();

  for (const item of fresh) {
    const list = bySection.get(item.suggestedSectionLabel) || [];
    list.push(item);
    bySection.set(item.suggestedSectionLabel, list);
  }

  const lines = [
    "# New AI Candidate Report",
    "",
    `- Generated at: ${now}`,
    `- Discovery window: recent ${daysBack} days where the source provides dates`,
    `- Existing site entries compared: ${existingCount}`,
    `- Candidate items after filtering: ${candidates.length}`,
    `- New candidates: ${fresh.length}`,
    `- High-confidence product/vendor candidates: ${productHigh.length}`,
    `- High-confidence open-source candidates: ${openSourceHigh.length}`,
    `- Already collected / likely duplicate: ${collected.length}`,
    `- Source errors: ${errors.length}`,
    "",
    "## How to Use",
    "",
    "Review high-confidence candidates first, open the source link, then manually add worthy entries to the matching section in `index.html`.",
    "This script intentionally does not edit the website cards, so low-quality or duplicate AI products will not enter the navigation automatically.",
    "",
  ];

  if (productHigh.length) {
    lines.push("## High-Confidence Product / Vendor Candidates", "");
    lines.push("| Score | Name | Suggested Section | Source | URL |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const item of productHigh.slice(0, 40)) {
      lines.push(`| ${item.confidence} | ${item.name} | ${item.suggestedSectionLabel} | ${item.source} | ${item.url} |`);
    }
    lines.push("");
  }

  if (openSourceHigh.length) {
    lines.push("## High-Confidence Open-Source Candidates", "");
    lines.push("| Score | Name | Suggested Section | Stars | Source | URL |");
    lines.push("| --- | --- | --- | --- | --- | --- |");
    for (const item of openSourceHigh.slice(0, 40)) {
      lines.push(`| ${item.confidence} | ${item.name} | ${item.suggestedSectionLabel} | ${item.metrics.stars || ""} | ${item.source} | ${item.url} |`);
    }
    lines.push("");
  }

  for (const [section, items] of bySection) {
    lines.push(`## ${section}`, "");
    lines.push("| Score | Kind | Name | Source | Keywords | URL |");
    lines.push("| --- | --- | --- | --- | --- | --- |");
    for (const item of items.slice(0, 60)) {
      lines.push(`| ${item.confidence} | ${item.kind} | ${item.name} | ${item.source} | ${item.matchedKeywords.join(", ")} | ${item.url} |`);
    }
    lines.push("");
  }

  if (collected.length) {
    lines.push("## Already Collected or Likely Duplicate", "");
    lines.push("| Name | Existing Match | Source | URL |");
    lines.push("| --- | --- | --- | --- |");
    for (const item of collected.slice(0, 80)) {
      lines.push(`| ${item.name} | ${item.existingMatch || "Exact URL match"} | ${item.source} | ${item.url} |`);
    }
    lines.push("");
  }

  if (errors.length) {
    lines.push("## Source Errors", "");
    lines.push("| Source | Detail | URL |");
    lines.push("| --- | --- | --- |");
    for (const item of errors) {
      lines.push(`| ${item.source} | ${item.error} | ${item.sourceUrl} |`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function renderShortlistMarkdown(candidates, errors, existingCount) {
  const now = new Date().toISOString();
  const fresh = candidates.filter((item) => !item.alreadyCollected);
  const tiers = ["优先核验", "可考虑收录", "观察", "暂不收录"];
  const counts = Object.fromEntries(tiers.map((tier) => [tier, fresh.filter((item) => item.curation.tier === tier).length]));
  const kindOrder = {
    "产品/厂商候选": 0,
    "开源项目": 1,
    "模型/社区条目": 2,
    "资讯/模型动态": 3,
    "社区线索": 4,
  };
  const displayLimits = {
    优先核验: 30,
    可考虑收录: 25,
    观察: 15,
  };

  const lines = [
    "# AI Candidate Shortlist",
    "",
    `- Generated at: ${now}`,
    `- Existing site entries compared: ${existingCount}`,
    `- New candidates reviewed by rules: ${fresh.length}`,
    `- 优先核验: ${counts["优先核验"]}`,
    `- 可考虑收录: ${counts["可考虑收录"]}`,
    `- 观察: ${counts["观察"]}`,
    `- 暂不收录: ${counts["暂不收录"]}`,
    `- Source errors: ${errors.length}`,
    "",
    "## 判断规则",
    "",
    "- 优先核验：更像独立产品、厂商官网或高热度开源工具，适合马上打开确认是否加入页面。",
    "- 可考虑收录：有一定热度或用途明确，但需要确认是否主流、是否仍活跃、是否和站内已有入口重复。",
    "- 观察：可能代表趋势或新方向，但目前更像新闻、模型条目、社区线索或早期项目。",
    "- 暂不收录：教程、文章、资料集合、个人经验、新闻报道、低相关项目，通常不适合作为导航入口。",
    "- 每档只展示最靠前的一部分；完整候选仍保存在 `new-ai-candidates.md/json`。",
    "",
  ];

  for (const tier of ["优先核验", "可考虑收录", "观察"]) {
    const limit = displayLimits[tier];
    const items = fresh
      .filter((item) => item.curation.tier === tier)
      .sort((a, b) => {
        const aKind = kindOrder[a.kind] ?? 9;
        const bKind = kindOrder[b.kind] ?? 9;
        return aKind - bKind || b.curation.score - a.curation.score || b.confidence - a.confidence;
      })
      .slice(0, limit);

    if (!items.length) continue;
    lines.push(`## ${tier}`, "");
    lines.push(`展示 ${items.length} / ${counts[tier]} 条。`, "");
    lines.push("| 收录分 | 类型 | 名称 | 建议版块 | 理由 | URL |");
    lines.push("| --- | --- | --- | --- | --- | --- |");
    for (const item of items) {
      lines.push(`| ${item.curation.score} | ${item.kind} | ${item.name} | ${item.suggestedSectionLabel} | ${item.curation.reason} | ${item.url} |`);
    }
    lines.push("");
  }

  const skipped = fresh
    .filter((item) => item.curation.tier === "暂不收录")
    .sort((a, b) => b.curation.score - a.curation.score)
    .slice(0, 20);

  if (skipped.length) {
    lines.push("## 暂不收录样例", "");
    lines.push(`展示 ${skipped.length} / ${counts["暂不收录"]} 条。`, "");
    lines.push("| 收录分 | 类型 | 名称 | 理由 | URL |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const item of skipped) {
      lines.push(`| ${item.curation.score} | ${item.kind} | ${item.name} | ${item.curation.reason} | ${item.url} |`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  console.log("Reading existing website entries...");
  const existingSites = await readExistingSites();

  console.log("Discovering candidates from RSS feeds, HN, GitHub, and Hugging Face...");
  const batches = await Promise.all([
    collectRssCandidates(),
    collectHnCandidates(),
    collectGithubCandidates(),
    collectHuggingFaceCandidates(),
  ]);

  const raw = batches.flat();
  const errors = raw.filter((item) => item.error);
  const candidates = withCuration(enrichCandidates(dedupeCandidates(raw.filter((item) => !item.error)), existingSites)).sort((a, b) => {
    if (a.alreadyCollected !== b.alreadyCollected) return Number(a.alreadyCollected) - Number(b.alreadyCollected);
    if (a.curation.tier !== b.curation.tier) {
      const order = ["优先核验", "可考虑收录", "观察", "暂不收录", "已收录/重复"];
      return order.indexOf(a.curation.tier) - order.indexOf(b.curation.tier);
    }
    if (a.curation.score !== b.curation.score) return b.curation.score - a.curation.score;
    return b.confidence - a.confidence || (b.publishedAt || "").localeCompare(a.publishedAt || "");
  });

  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "new-ai-candidates.json"), JSON.stringify(candidates, null, 2));
  await writeFile(path.join(outputDir, "new-ai-candidates.md"), renderMarkdown(candidates, errors, existingSites.length));
  await writeFile(path.join(outputDir, "new-ai-shortlist.json"), JSON.stringify(candidates.filter((item) => !["暂不收录", "已收录/重复"].includes(item.curation.tier)), null, 2));
  await writeFile(path.join(outputDir, "new-ai-shortlist.md"), renderShortlistMarkdown(candidates, errors, existingSites.length));

  const fresh = candidates.filter((item) => !item.alreadyCollected);
  const productHigh = fresh.filter((item) => item.kind === "产品/厂商候选" && item.confidence >= 65);
  const openSourceHigh = fresh.filter((item) => item.kind === "开源项目" && item.confidence >= 75);

  console.log("");
  console.log(
    `Done. ${candidates.length} candidates, ${fresh.length} new, ${productHigh.length} product/vendor high-confidence, ${openSourceHigh.length} open-source high-confidence.`,
  );
  console.log(`Reports: ${path.relative(root, path.join(outputDir, "new-ai-candidates.md"))}`);
  console.log(`Shortlist: ${path.relative(root, path.join(outputDir, "new-ai-shortlist.md"))}`);
  if (errors.length) console.log(`Source warnings: ${errors.length}. See the report for details.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
