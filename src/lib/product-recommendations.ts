import { planRows } from "./data.ts";
export {
  productProfiles,
  productScenarios,
  scenarioGuides,
  type ProductScenarioId,
} from "./product-scenarios.ts";
import { productProfiles } from "./product-scenarios.ts";

export const productRecommendationCandidates = productProfiles.flatMap((profile) =>
  planRows
    .filter((plan) => plan.providerId === profile.providerId)
    .map((plan) => ({ plan, ...profile })),
);

export { estimatedMonthlyCny } from "./pricing.ts";
