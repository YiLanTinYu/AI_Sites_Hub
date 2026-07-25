const FALLBACK_USD_CNY = 7;

/**
 * 估算套餐的人民币月费，用于跨币种粗排。
 * 优先使用月付价，缺失时回退到年付折月价；两者都缺失时返回一个很大的数，
 * 使无价套餐排在最后。USD 按固定粗略汇率换算，仅用于排序，不用于展示精确价格。
 */
export function estimatedMonthlyCny(
  currency: "USD" | "CNY",
  monthlyPrice: number | null,
  annualMonthlyEquivalent: number | null,
) {
  const monthly = monthlyPrice ?? annualMonthlyEquivalent;
  if (monthly === null) return 99999;
  return currency === "USD" ? monthly * FALLBACK_USD_CNY : monthly;
}
