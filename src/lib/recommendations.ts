import { modelPriceRows } from "./data";
import type { ModelPriceRow } from "./schema";

export const scenarios = {
  budget: {
    name: "低成本使用",
    description: "适合批量摘要、分类、抽取和高频轻量任务。",
    capabilities: [],
    contextTarget: 128000,
    weights: { cost: 70, capability: 5, context: 10, stability: 15 },
  },
  coding: {
    name: "编程与智能体",
    description: "适合写代码、自动使用外部工具，以及需要连续完成很多步骤的任务。",
    capabilities: ["coding", "tools", "reasoning"],
    contextTarget: 200000,
    weights: { cost: 25, capability: 45, context: 20, stability: 10 },
  },
  longContext: {
    name: "长文档处理",
    description: "适合一次阅读大型代码库、论文、合同和大量资料。",
    capabilities: ["long-context"],
    contextTarget: 1000000,
    weights: { cost: 20, capability: 25, context: 45, stability: 10 },
  },
  multimodal: {
    name: "图片与视频理解",
    description: "适合同时理解文字、图片或视频内容。",
    capabilities: ["vision", "reasoning"],
    contextTarget: 200000,
    weights: { cost: 20, capability: 50, context: 15, stability: 15 },
  },
} as const;

export type ScenarioId = keyof typeof scenarios;

function costScore(row: ModelPriceRow) {
  const peers = modelPriceRows.filter((item) => item.currency === row.currency);
  const totals = peers.map((item) => item.input + item.output);
  const min = Math.min(...totals);
  const max = Math.max(...totals);
  if (max === min) return 100;
  return 100 - ((row.input + row.output - min) / (max - min)) * 100;
}

export function recommendationsFor(scenarioId: ScenarioId) {
  const scenario = scenarios[scenarioId];
  return modelPriceRows
    .map((row) => {
      const matched = scenario.capabilities.filter((capability) =>
        row.capabilities.includes(capability),
      ).length;
      const capabilityScore =
        scenario.capabilities.length === 0 ? 100 : (matched / scenario.capabilities.length) * 100;
      const contextScore = Math.min(
        100,
        ((row.contextWindow ?? 0) / scenario.contextTarget) * 100,
      );
      const stabilityScore = row.status === "stable" ? 100 : row.status === "preview" ? 65 : 45;
      const components = {
        cost: Math.round(costScore(row)),
        capability: Math.round(capabilityScore),
        context: Math.round(contextScore),
        stability: stabilityScore,
      };
      const score = Math.round(
        (components.cost * scenario.weights.cost +
          components.capability * scenario.weights.capability +
          components.context * scenario.weights.context +
          components.stability * scenario.weights.stability) /
          100,
      );
      return { row, score, components };
    })
    .filter(({ components }) =>
      scenarioId === "multimodal" ? components.capability > 0 : true,
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}
