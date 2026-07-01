import type { APIRoute } from "astro";
import { publishedDealRows } from "../../lib/data";

export const prerender = true;

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        deals: publishedDealRows.map(({ provider, ...deal }) => ({
          ...deal,
          provider: provider.name,
        })),
      },
      null,
      2,
    ),
    { headers: { "content-type": "application/json; charset=utf-8" } },
  );
