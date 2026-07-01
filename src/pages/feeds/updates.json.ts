import type { APIRoute } from "astro";
import { models, priceHistory, providers } from "../../lib/data";

export const prerender = true;

export const GET: APIRoute = () => {
  const modelMap = new Map(models.map((model) => [model.id, model]));
  const providerMap = new Map(providers.map((provider) => [provider.id, provider]));
  return new Response(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        updates: [...priceHistory]
          .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
          .map((entry) => {
            const model = modelMap.get(entry.modelId);
            return {
              ...entry,
              model: model?.name,
              provider: model ? providerMap.get(model.providerId)?.name : undefined,
            };
          }),
      },
      null,
      2,
    ),
    { headers: { "content-type": "application/json; charset=utf-8" } },
  );
};
