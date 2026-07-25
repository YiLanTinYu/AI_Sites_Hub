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

export const scenarioGuides = {
  chat: {
    title: "日常问答 AI 怎么选",
    intro: "日常问答最重要的是容易上手、回答稳定、免费额度够用。偶尔使用先看免费版，高频使用再比较月费和附带工具。",
    bestFor: ["解释概念和生活建议", "简单写作、翻译和脑暴", "不想研究 API 与复杂参数的普通用户"],
    selectionTips: ["先试免费版，确认回答风格是否合适", "如果经常上传文件或用图片/语音，再考虑付费", "不要只看模型名，套餐额度和可用地区同样重要"],
  },
  research: {
    title: "搜索研究 AI 怎么选",
    intro: "搜索研究要优先看来源引用、联网能力和长文整理能力。价格不是唯一标准，能否帮你核对出处更关键。",
    bestFor: ["资料检索、竞品调研和报告整理", "需要引用来源的学习和工作", "经常把网页、PDF 或长文本交给 AI 总结"],
    selectionTips: ["优先选择会给出处的产品", "看是否支持文件、网页和长上下文", "重要结论仍要回到原始来源二次确认"],
  },
  coding: {
    title: "编程开发 AI 怎么选",
    intro: "编程场景要看 IDE 集成、多文件理解、代码修改体验和可持续额度。普通问答模型不一定适合真实项目开发。",
    bestFor: ["代码补全、调试和解释报错", "多文件项目修改", "希望把 AI 放进日常开发工作流的用户"],
    selectionTips: ["高频开发优先看编辑器集成体验", "复杂项目要看上下文和多文件能力", "国内网络环境和付款方式也会影响长期可用性"],
  },
  image: {
    title: "AI 图片生成工具怎么选",
    intro: "图片生成要看风格质量、可控性、商用限制和每月生成额度。便宜套餐不一定适合高频商用。",
    bestFor: ["海报、插画、商品图和灵感草图", "品牌视觉探索", "不想本地部署模型的创作者"],
    selectionTips: ["先看作品风格是否符合你的审美", "注意版权、商用和人物肖像限制", "高频使用时要核算每张图或每组图的真实成本"],
  },
  video: {
    title: "AI 视频生成工具怎么选",
    intro: "视频生成的价格差异很大，要看时长、清晰度、生成次数和编辑能力。订阅价之外还要看积分消耗。",
    bestFor: ["短视频素材、分镜和动态画面", "广告创意预览", "需要快速试错的视频创作者"],
    selectionTips: ["把积分换算成每秒或每条视频成本", "确认是否支持续写、镜头控制和素材编辑", "先用低档套餐测试稳定性，再决定长期付费"],
  },
  audio: {
    title: "AI 音乐和语音工具怎么选",
    intro: "音频类产品要区分音乐生成、配音、声音克隆和实时语音。不同产品的授权和使用边界差别很大。",
    bestFor: ["歌曲草稿、配乐和播客片头", "短视频旁白与本地化配音", "需要自然语音或声音克隆的内容团队"],
    selectionTips: ["先确认生成内容是否可商用", "声音克隆要注意授权和合规", "按每月音频分钟数估算，不要只看月费"],
  },
  office: {
    title: "写作办公 AI 怎么选",
    intro: "写作办公要看文档处理、表格/演示辅助、团队协作和稳定性。真正省时间的通常是工作流整合，而不只是聊天能力。",
    bestFor: ["方案、邮件、总结和汇报材料", "文档阅读和知识整理", "需要和办公软件结合的个人或小团队"],
    selectionTips: ["优先看是否支持文件和项目管理", "需要团队协作时关注权限和数据边界", "中文写作要实际试用语气和改写质量"],
  },
} satisfies Record<
  ProductScenarioId,
  {
    title: string;
    intro: string;
    bestFor: string[];
    selectionTips: string[];
  }
>;

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
