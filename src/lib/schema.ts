import { z } from "zod";

const isoDate = z.iso.date();
const httpUrl = z.url().refine((url) => /^https?:\/\//.test(url), {
  message: "必须使用 HTTP 或 HTTPS 官方来源",
});

export const providerSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  region: z.enum(["global", "china"]),
  website: httpUrl,
  pricingUrl: httpUrl,
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const modelSchema = z.object({
  id: z.string().regex(/^[a-z0-9.-]+$/),
  providerId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  modalities: z.array(z.enum(["text", "image", "audio", "video"])).min(1),
  capabilities: z.array(
    z.enum(["reasoning", "coding", "tools", "vision", "long-context"]),
  ),
  contextWindow: z.number().int().positive().nullable(),
  status: z.enum(["stable", "preview", "limited"]),
});

export const priceSchema = z.object({
  id: z.string().regex(/^[a-z0-9.-]+$/),
  modelId: z.string().min(1),
  currency: z.enum(["USD", "CNY"]),
  unit: z.literal("1M_tokens"),
  input: z.number().nonnegative(),
  cachedInput: z.number().nonnegative().nullable(),
  output: z.number().nonnegative(),
  batchInput: z.number().nonnegative().nullable(),
  batchOutput: z.number().nonnegative().nullable(),
  sourceUrl: httpUrl,
  verifiedAt: isoDate,
  notes: z.string().optional(),
});

export const priceHistorySchema = z.object({
  id: z.string().regex(/^[a-z0-9.-]+$/),
  priceId: z.string().min(1),
  modelId: z.string().min(1),
  currency: z.enum(["USD", "CNY"]),
  unit: z.literal("1M_tokens"),
  input: z.number().nonnegative(),
  cachedInput: z.number().nonnegative().nullable(),
  output: z.number().nonnegative(),
  recordedAt: isoDate,
  sourceUrl: httpUrl,
  changeType: z.enum(["initial", "increase", "decrease", "mixed", "unchanged"]),
  notes: z.string().optional(),
});

export const exchangeRateSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  base: z.literal("USD"),
  quote: z.literal("CNY"),
  rate: z.number().positive(),
  observedAt: isoDate,
  source: z.literal("European Central Bank"),
  sourceUrl: httpUrl,
  eurUsd: z.number().positive(),
  eurCny: z.number().positive(),
});

export const planSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  providerId: z.string().min(1),
  name: z.string().min(1),
  audience: z.enum(["individual", "team", "enterprise"]),
  currency: z.enum(["USD", "CNY"]),
  monthlyPrice: z.number().nonnegative().nullable(),
  annualPrice: z.number().nonnegative().nullable(),
  annualMonthlyEquivalent: z.number().nonnegative().nullable(),
  billingOptions: z.array(z.enum(["free", "monthly", "annual", "contact_sales"])).min(1),
  features: z.array(z.string().min(1)).min(1),
  sourceUrl: httpUrl,
  verifiedAt: isoDate,
  notes: z.string().optional(),
});

export const dealSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    providerId: z.string().min(1),
    modelIds: z.array(z.string().min(1)),
    title: z.string().min(1),
    summary: z.string().min(1),
    benefit: z.string().min(1),
    type: z.enum([
      "discount",
      "credit",
      "free_trial",
      "education",
      "startup",
      "annual_plan",
    ]),
    currency: z.enum(["USD", "CNY"]).nullable(),
    originalPrice: z.number().nonnegative().nullable(),
    dealPrice: z.number().nonnegative().nullable(),
    discountPercent: z.number().min(0).max(100).nullable(),
    startsAt: isoDate.nullable(),
    endsAt: isoDate.nullable(),
    eligibility: z.string().min(1),
    restrictions: z.array(z.string().min(1)),
    sourceUrl: httpUrl,
    discoveredAt: isoDate,
    verifiedAt: isoDate,
    reviewStatus: z.enum(["approved", "pending", "rejected"]),
    featured: z.boolean(),
    affiliate: z.boolean(),
    calculatorMode: z.enum(["informational", "free_quota", "price_multiplier"]),
    calculatorMultiplier: z.number().min(0).max(1).nullable(),
  })
  .superRefine((deal, context) => {
    if (
      deal.type !== "free_trial" &&
      deal.dealPrice !== null &&
      deal.originalPrice === null
    ) {
      context.addIssue({
        code: "custom",
        path: ["originalPrice"],
        message: "填写优惠价时必须同时填写原价",
      });
    }
    if (deal.startsAt && deal.endsAt && deal.startsAt > deal.endsAt) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "结束日期不能早于开始日期",
      });
    }
    if (
      deal.calculatorMode === "price_multiplier" &&
      deal.calculatorMultiplier === null
    ) {
      context.addIssue({
        code: "custom",
        path: ["calculatorMultiplier"],
        message: "直接价格折扣必须提供计算倍率",
      });
    }
    if (
      deal.calculatorMode !== "price_multiplier" &&
      deal.calculatorMultiplier !== null
    ) {
      context.addIssue({
        code: "custom",
        path: ["calculatorMultiplier"],
        message: "非直接价格折扣不能提供计算倍率",
      });
    }
  });

export const directoryCategorySchema = z.object({
  id: z.enum(["global", "china", "agents", "skills", "research", "coding", "creative"]),
  name: z.string().min(1),
  description: z.string().min(1),
});

export const directoryItemSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  categoryId: directoryCategorySchema.shape.id,
  name: z.string().min(1),
  provider: z.string().min(1),
  description: z.string().min(1),
  url: httpUrl,
  domain: z.string().min(1),
  logoText: z.string().min(1),
  tags: z.array(z.string().min(1)),
  badges: z.array(z.string().min(1)).max(3),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  rank: z.number().int().nonnegative(),
});

export const providersSchema = z.array(providerSchema);
export const modelsSchema = z.array(modelSchema);
export const pricesSchema = z.array(priceSchema);
export const priceHistoriesSchema = z.array(priceHistorySchema);
export const exchangeRatesSchema = z.array(exchangeRateSchema);
export const plansSchema = z.array(planSchema);
export const dealsSchema = z.array(dealSchema);
export const directoryCategoriesSchema = z.array(directoryCategorySchema);
export const directoryItemsSchema = z.array(directoryItemSchema);

export type Provider = z.infer<typeof providerSchema>;
export type Model = z.infer<typeof modelSchema>;
export type Price = z.infer<typeof priceSchema>;
export type PriceHistory = z.infer<typeof priceHistorySchema>;
export type ExchangeRate = z.infer<typeof exchangeRateSchema>;
export type Plan = z.infer<typeof planSchema>;
export type Deal = z.infer<typeof dealSchema>;
export type DealStatus = "upcoming" | "active" | "ending_soon" | "ended" | "pending";
export type DirectoryCategory = z.infer<typeof directoryCategorySchema>;
export type DirectoryItem = z.infer<typeof directoryItemSchema>;

export type ModelPriceRow = Model &
  Price & {
    provider: Provider;
  };
