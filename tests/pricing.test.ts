import { test } from "node:test";
import assert from "node:assert/strict";

import { estimatedMonthlyCny } from "../src/lib/pricing.ts";

test("人民币套餐直接返回月付价", () => {
  assert.equal(estimatedMonthlyCny("CNY", 99, null), 99);
});

test("美元套餐按固定汇率换算为人民币", () => {
  assert.equal(estimatedMonthlyCny("USD", 20, null), 140);
});

test("缺月付价时回退到年付折月价", () => {
  assert.equal(estimatedMonthlyCny("CNY", null, 82), 82);
});

test("美元套餐缺月付价时按年付折月价换算", () => {
  assert.equal(estimatedMonthlyCny("USD", null, 10), 70);
});

test("优先使用月付价而非年付折月价", () => {
  assert.equal(estimatedMonthlyCny("CNY", 99, 82), 99);
});

test("月付与年付均缺失时返回兜底大数（排最后）", () => {
  assert.equal(estimatedMonthlyCny("USD", null, null), 99999);
  assert.equal(estimatedMonthlyCny("CNY", null, null), 99999);
});

test("免费套餐（月付价为 0）返回 0 而非兜底值", () => {
  assert.equal(estimatedMonthlyCny("CNY", 0, null), 0);
  assert.equal(estimatedMonthlyCny("USD", 0, null), 0);
});
