#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "cheerio";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const categoryIds = [
  "global",
  "china",
  "agents",
  "skills",
  "research",
  "coding",
  "creative",
];

const rankings = {
  global: [
    "OpenAI Models", "Claude Models", "Gemini", "Llama", "Mistral Models",
    "Hugging Face Models", "Grok", "Azure AI Foundry", "Amazon Nova", "Command",
    "Together AI", "Fireworks AI", "Replicate", "GroqCloud", "Cerebras Inference",
    "Jamba", "IBM Granite", "Mosaic AI", "Snowflake Cortex AI",
  ],
  china: [
    "DeepSeek", "通义千问 / Qwen", "文心大模型 / ERNIE", "豆包大模型 / Seed",
    "Moonshot / Kimi Models", "腾讯混元", "智谱 GLM", "讯飞星火", "MiniMax Models",
    "日日新 / SenseNova", "盘古大模型", "ModelScope", "百川大模型", "Yi Models",
    "StepFun", "天工大模型", "360 智脑", "书生浦语 InternLM", "OpenBMB / MiniCPM",
    "SiliconFlow",
  ],
  agents: [
    "ChatGPT", "Claude", "Gemini App", "Microsoft Copilot", "Grok", "豆包", "Kimi",
    "腾讯元宝", "文心一言", "智谱清言", "Poe", "Manus", "Meta AI", "You.com",
    "Monica",
  ],
  skills: [
    "GPT Store", "Claude Skills", "Dify", "Coze", "LangGraph", "n8n",
    "Copilot Studio", "Agentforce", "Zapier Agents", "LlamaIndex", "CrewAI", "Make",
    "UiPath Agentic Automation", "AutoGen", "Flowise", "Langflow", "Botpress",
    "Voiceflow", "Lindy", "Gumloop", "Stack AI", "Relevance AI", "Workato",
    "Pipedream", "Vellum", "ServiceNow AI Agents", "Automation Anywhere", "AutoGPT",
    "Adept", "MindStudio", "Wordware", "Relay.app", "Haystack",
  ],
  research: [
    "Perplexity", "NotebookLM", "You.com Search", "Phind", "秘塔 AI 搜索", "Felo Search",
    "Consensus", "Elicit", "Semantic Scholar", "Scite", "SciSpace", "Genspark",
    "ChatPDF", "ResearchRabbit", "Connected Papers", "Humata",
  ],
  coding: [
    "GitHub Copilot", "Cursor", "Claude Code", "Codex", "Devin", "Windsurf",
    "Replit Agent", "Lovable", "v0", "Cline", "Continue", "Tabnine", "Sourcegraph Amp",
    "Amazon Q Developer", "Bolt.new", "Trae", "CodeRabbit", "Qodo", "Base44",
  ],
  creative: [
    "Midjourney", "Runway", "Suno", "ElevenLabs", "可灵 AI", "Pika",
    "Luma Dream Machine", "Adobe Firefly", "Ideogram", "Leonardo AI", "Canva AI",
    "Gamma", "Notion AI", "HeyGen", "Synthesia", "Udio", "Descript", "海螺 AI",
    "PixVerse", "Stable Assistant", "Freepik AI", "Beautiful.ai", "Pitch", "Otter.ai",
  ],
};

const popular = new Set([
  "OpenAI Models",
  "Claude Models",
  "Gemini",
  "DeepSeek",
  "通义千问 / Qwen",
  "ChatGPT",
  "Claude",
  "GitHub Copilot",
  "Cursor",
  "Midjourney",
  "Perplexity",
]);

const openSource = new Set([
  "Llama",
  "Hugging Face Models",
  "Dify",
  "LangGraph",
  "n8n",
  "Cline",
  "Continue",
  "ModelScope",
]);

function badgesFor(name, categoryId) {
  const badges = [];
  if (popular.has(name)) badges.push("热门");
  if (openSource.has(name)) badges.push("开源");
  if (["global", "china"].includes(categoryId)) badges.push("模型平台");
  if (categoryId === "coding") badges.push("开发者");
  if (categoryId === "creative") badges.push("创作");
  if (categoryId === "research") badges.push("研究");
  if (categoryId === "skills") badges.push("Agent");
  return badges.slice(0, 3);
}

function cleanText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function accentFrom(style) {
  return style.match(/--accent:\s*(#[0-9a-fA-F]{6})/)?.[1] ?? "#67e8f9";
}

async function main() {
  const html = await readFile(path.join(root, "index.html"), "utf8");
  const $ = load(html);
  const categories = [];
  const items = [];

  for (const categoryId of categoryIds) {
    const section = $(`#${categoryId}`);
    const name = cleanText(section.find(".section-head h2").first().text());
    const description = cleanText(section.find(".section-head p").first().text());
    const ranking = new Map(
      (rankings[categoryId] ?? []).map((itemName, index) => [itemName, index]),
    );

    categories.push({ id: categoryId, name, description });

    const categoryItems = section
      .find(".model-card")
      .toArray()
      .map((element, sourceIndex) => {
        const card = $(element);
        const itemName = cleanText(card.find("h3").first().text());
        const logo = card.find(".logo").first();

        return {
          sourceIndex,
          rank: ranking.get(itemName) ?? 1000 + sourceIndex,
          name: itemName,
          provider: cleanText(card.find(".tag").first().text()),
          description: cleanText(card.children("p").first().text()),
          url: card.find(".card-link").first().attr("href"),
          domain: logo.attr("data-domain"),
          logoText: cleanText(logo.text()),
          tags: (card.attr("data-tags") ?? "").split(/\s+/).filter(Boolean),
          badges: badgesFor(itemName, categoryId),
          accent: accentFrom(card.attr("style") ?? ""),
        };
      })
      .sort((a, b) => a.rank - b.rank || a.sourceIndex - b.sourceIndex);

    categoryItems.forEach((item, index) => {
      items.push({
        id: `${categoryId}-${String(index + 1).padStart(2, "0")}`,
        categoryId,
        name: item.name,
        provider: item.provider,
        description: item.description,
        url: item.url,
        domain: item.domain,
        logoText: item.logoText,
        tags: item.tags,
        badges: item.badges,
        accent: item.accent,
        rank: index,
      });
    });
  }

  await writeFile(
    path.join(root, "src/data/directory-categories.json"),
    `${JSON.stringify(categories, null, 2)}\n`,
  );
  await writeFile(
    path.join(root, "src/data/directory-items.json"),
    `${JSON.stringify(items, null, 2)}\n`,
  );

  console.log(`Migrated ${items.length} directory items across ${categories.length} categories.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
