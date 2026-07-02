import directoryCategoriesJson from "../data/directory-categories.json";
import directoryItemsJson from "../data/directory-items.json";
import dealsJson from "../data/deals.json";
import modelsJson from "../data/models.json";
import priceHistoryJson from "../data/price-history.json";
import exchangeRatesJson from "../data/exchange-rates.json";
import plansJson from "../data/plans.json";
import pricesJson from "../data/prices.json";
import providersJson from "../data/providers.json";
import {
  directoryCategoriesSchema,
  directoryItemsSchema,
  dealsSchema,
  modelsSchema,
  priceHistoriesSchema,
  exchangeRatesSchema,
  plansSchema,
  pricesSchema,
  providersSchema,
  type ModelPriceRow,
  type PlanRow,
  type Deal,
  type DealStatus,
} from "./schema";

export const directoryCategories = directoryCategoriesSchema.parse(directoryCategoriesJson);
export const directoryItems = directoryItemsSchema.parse(directoryItemsJson);
export const deals = dealsSchema.parse(dealsJson);
export const providers = providersSchema.parse(providersJson);
export const models = modelsSchema.parse(modelsJson);
export const priceHistory = priceHistoriesSchema.parse(priceHistoryJson);
export const exchangeRates = exchangeRatesSchema.parse(exchangeRatesJson);
export const plans = plansSchema.parse(plansJson);
export const prices = pricesSchema.parse(pricesJson);

const providersById = new Map(providers.map((provider) => [provider.id, provider]));
const modelsById = new Map(models.map((model) => [model.id, model]));

for (const model of models) {
  if (!providersById.has(model.providerId)) {
    throw new Error(`模型 ${model.id} 引用了不存在的厂商 ${model.providerId}`);
  }
}

for (const price of prices) {
  if (!modelsById.has(price.modelId)) {
    throw new Error(`价格 ${price.id} 引用了不存在的模型 ${price.modelId}`);
  }
}

const pricesById = new Map(prices.map((price) => [price.id, price]));
for (const entry of priceHistory) {
  if (!pricesById.has(entry.priceId)) {
    throw new Error(`价格历史 ${entry.id} 引用了不存在的价格 ${entry.priceId}`);
  }
  if (!modelsById.has(entry.modelId)) {
    throw new Error(`价格历史 ${entry.id} 引用了不存在的模型 ${entry.modelId}`);
  }
}

for (const plan of plans) {
  if (!providersById.has(plan.providerId)) {
    throw new Error(`套餐 ${plan.id} 引用了不存在的厂商 ${plan.providerId}`);
  }
}

for (const deal of deals) {
  if (!providersById.has(deal.providerId)) {
    throw new Error(`优惠 ${deal.id} 引用了不存在的厂商 ${deal.providerId}`);
  }
  for (const modelId of deal.modelIds) {
    if (!modelsById.has(modelId)) {
      throw new Error(`优惠 ${deal.id} 引用了不存在的模型 ${modelId}`);
    }
  }
}

export const modelPriceRows: ModelPriceRow[] = prices.map((price) => {
  const model = modelsById.get(price.modelId);
  if (!model) throw new Error(`找不到模型 ${price.modelId}`);

  const provider = providersById.get(model.providerId);
  if (!provider) throw new Error(`找不到厂商 ${model.providerId}`);

  return { ...model, ...price, provider };
});

export const planRows: PlanRow[] = plans.map((plan) => {
  const provider = providersById.get(plan.providerId);
  if (!provider) throw new Error(`找不到厂商 ${plan.providerId}`);
  return { ...plan, provider };
});

export const latestVerifiedAt = modelPriceRows
  .map((row) => row.verifiedAt)
  .sort()
  .at(-1);

export const latestExchangeRate = [...exchangeRates]
  .sort((a, b) => a.observedAt.localeCompare(b.observedAt))
  .at(-1);

export function priceHistoryFor(modelId: string) {
  return priceHistory
    .filter((entry) => entry.modelId === modelId)
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
}

function dateAtChinaMidnight(value: string) {
  return new Date(`${value}T00:00:00+08:00`);
}

function dateAtChinaDayEnd(value: string) {
  return new Date(`${value}T23:59:59+08:00`);
}

export function dealStatus(deal: Deal, now = new Date()): DealStatus {
  if (deal.reviewStatus !== "approved") return "pending";
  if (deal.startsAt && now < dateAtChinaMidnight(deal.startsAt)) return "upcoming";
  if (deal.endsAt && now > dateAtChinaDayEnd(deal.endsAt)) return "ended";
  if (deal.endsAt) {
    const daysLeft = (dateAtChinaDayEnd(deal.endsAt).getTime() - now.getTime()) / 86_400_000;
    if (daysLeft <= 7) return "ending_soon";
  }
  return "active";
}

export const dealRows = deals.map((deal) => {
  const provider = providersById.get(deal.providerId);
  if (!provider) throw new Error(`找不到厂商 ${deal.providerId}`);
  return { ...deal, provider, status: dealStatus(deal) };
});

export const publishedDealRows = dealRows.filter(
  (deal) => deal.reviewStatus === "approved",
);

const directoryCategoryIds = new Set(directoryCategories.map((category) => category.id));

for (const item of directoryItems) {
  if (!directoryCategoryIds.has(item.categoryId)) {
    throw new Error(`导航入口 ${item.id} 引用了不存在的分类 ${item.categoryId}`);
  }
}

export function directoryItemsFor(categoryId: string) {
  return directoryItems
    .filter((item) => item.categoryId === categoryId)
    .sort((a, b) => a.rank - b.rank);
}
