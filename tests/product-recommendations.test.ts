import { test } from "node:test";
import assert from "node:assert/strict";

import {
  productProfiles,
  productScenarios,
  scenarioGuides,
  type ProductScenarioId,
} from "../src/lib/product-scenarios.ts";

const scenarioIds = Object.keys(productScenarios) as ProductScenarioId[];

test("每个场景都有面向普通用户的选择说明", () => {
  for (const id of scenarioIds) {
    const guide = scenarioGuides[id];
    assert.ok(guide.title.length >= 6, `${id} 缺少标题`);
    assert.ok(guide.intro.length >= 20, `${id} 缺少简介`);
    assert.ok(guide.bestFor.length >= 2, `${id} 缺少适用情况`);
    assert.ok(guide.selectionTips.length >= 2, `${id} 缺少选择建议`);
  }
});

test("每个场景至少能推荐一个已收录套餐", () => {
  for (const id of scenarioIds) {
    const candidates = productProfiles.filter((profile) => profile.uses.includes(id));
    assert.ok(candidates.length > 0, `${id} 没有推荐候选`);
  }
});
