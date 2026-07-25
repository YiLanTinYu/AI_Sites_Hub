import type { Deal } from "../src/lib/schema.ts";

/**
 * 构造一个通过 schema 校验的最小合法 Deal，测试时只覆盖关心的字段。
 */
export function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: "provider-product-2026-test",
    providerId: "provider",
    modelIds: [],
    title: "测试优惠",
    summary: "用于测试的优惠",
    benefit: "测试收益",
    type: "discount",
    currency: "USD",
    originalPrice: 20,
    dealPrice: 10,
    discountPercent: 50,
    startsAt: null,
    endsAt: null,
    eligibility: "所有用户",
    restrictions: [],
    sourceUrl: "https://example.com/deal",
    discoveredAt: "2026-06-01",
    verifiedAt: "2026-06-01",
    reviewStatus: "approved",
    featured: false,
    affiliate: false,
    calculatorMode: "informational",
    calculatorMultiplier: null,
    ...overrides,
  };
}
