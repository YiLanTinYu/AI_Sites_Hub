import { planRows } from "./data";

export const productScenarios = {
  chat: { name: "日常问答", description: "聊天答疑、解释概念、生活建议和灵感整理。" },
  research: { name: "搜索研究", description: "联网查资料、核对来源、市场调研和报告整理。" },
  coding: { name: "编程开发", description: "代码补全、排查错误、理解项目和开发自动化。" },
  image: { name: "图片生成", description: "制作插画、海报、商品图和视觉创意。" },
  video: { name: "视频生成", description: "生成短视频、动态画面、素材和辅助剪辑。" },
  audio: { name: "音乐音频", description: "创作歌曲、配乐、配音和自然语音。" },
  office: { name: "写作办公", description: "写作润色、文档总结、方案和办公内容整理。" },
} as const;

export type ProductScenarioId = keyof typeof productScenarios;

export const productProfiles = [
  { providerId: "openai", uses: ["chat", "research", "office"], quality: 9, ease: 9, reason: "综合能力均衡，适合问答、写作和多种日常任务" },
  { providerId: "anthropic", uses: ["chat", "coding", "office"], quality: 9, ease: 8, reason: "长文写作、代码理解和复杂分析表现突出" },
  { providerId: "google", uses: ["chat", "research", "image", "office"], quality: 8, ease: 8, reason: "适合 Google 生态、资料整理和多模态任务" },
  { providerId: "perplexity", uses: ["research"], quality: 10, ease: 9, reason: "强调来源引用，适合查资料和研究报告" },
  { providerId: "github", uses: ["coding"], quality: 8, ease: 9, reason: "适合日常 IDE 编程、代码补全和 Agent 工作流" },
  { providerId: "cursor", uses: ["coding"], quality: 9, ease: 7, reason: "适合多文件修改、代码库理解和高频开发" },
  { providerId: "midjourney", uses: ["image"], quality: 10, ease: 7, reason: "适合高质量图片生成和视觉风格探索" },
  { providerId: "runway", uses: ["video"], quality: 10, ease: 7, reason: "适合 AI 视频生成、编辑和持续创作" },
  { providerId: "suno", uses: ["audio"], quality: 9, ease: 9, reason: "适合歌曲、配乐和音乐生成" },
  { providerId: "elevenlabs", uses: ["audio"], quality: 9, ease: 8, reason: "适合配音、自然语音和专业音频内容" },
  { providerId: "deepseek", uses: ["chat", "coding"], quality: 8, ease: 8, reason: "免费中文问答与代码能力突出" },
  { providerId: "moonshot", uses: ["chat", "research", "coding", "office"], quality: 8, ease: 9, reason: "中文体验友好，适合文档、研究和 Agent 任务" },
  { providerId: "zhipu", uses: ["coding"], quality: 8, ease: 7, reason: "国内可用的专业 AI 编程套餐" },
  { providerId: "baidu-comate", uses: ["coding"], quality: 7, ease: 8, reason: "国内代码补全、代码问答和研发智能体工具" },
] satisfies Array<{
  providerId: string;
  uses: ProductScenarioId[];
  quality: number;
  ease: number;
  reason: string;
}>;

export const productRecommendationCandidates = productProfiles.flatMap((profile) =>
  planRows
    .filter((plan) => plan.providerId === profile.providerId)
    .map((plan) => ({ plan, ...profile })),
);

export function estimatedMonthlyCny(currency: "USD" | "CNY", monthlyPrice: number | null, annualMonthlyEquivalent: number | null) {
  const monthly = monthlyPrice ?? annualMonthlyEquivalent;
  if (monthly === null) return 99999;
  return currency === "USD" ? monthly * 7 : monthly;
}
