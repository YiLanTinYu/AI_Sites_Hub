#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dataDir = path.join(root, "src", "data");
const prices = JSON.parse(await readFile(path.join(dataDir, "prices.json"), "utf8"));
const outputPath = path.join(dataDir, "price-history.json");

let existing = [];
try {
  existing = JSON.parse(await readFile(outputPath, "utf8"));
} catch {
  existing = [];
}

const ids = new Set(existing.map((entry) => entry.id));
function classifyChange(price, previous) {
  if (!previous) return "initial";
  const before = [previous.input, previous.output];
  const after = [price.input, price.output];
  const hasIncrease = after.some((value, index) => value > before[index]);
  const hasDecrease = after.some((value, index) => value < before[index]);
  if (hasIncrease && hasDecrease) return "mixed";
  if (hasIncrease) return "increase";
  if (hasDecrease) return "decrease";
  return "unchanged";
}

const additions = prices
  .map((price) => {
    const previous = existing
      .filter((entry) => entry.priceId === price.id)
      .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
      .at(-1);
    const changeType = classifyChange(price, previous);
    return {
      id: `${price.id}-${price.verifiedAt}`,
      priceId: price.id,
      modelId: price.modelId,
      currency: price.currency,
      unit: price.unit,
      input: price.input,
      cachedInput: price.cachedInput,
      output: price.output,
      recordedAt: price.verifiedAt,
      sourceUrl: price.sourceUrl,
      changeType,
      notes:
        changeType === "initial"
          ? "Phase 3 初始价格基线。"
          : "根据当前价格数据生成的复核快照。",
    };
  })
  .filter((entry) => !ids.has(entry.id));

await writeFile(
  outputPath,
  `${JSON.stringify([...existing, ...additions], null, 2)}\n`,
  "utf8",
);
console.log(`价格历史基线已更新：新增 ${additions.length} 条，共 ${existing.length + additions.length} 条。`);
