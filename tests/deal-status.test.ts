import { test } from "node:test";
import assert from "node:assert/strict";

import { dealStatus } from "../src/lib/deal-status.ts";
import { makeDeal } from "./helpers.ts";

// 所有边界都以东八区（+08:00）为基准。
// 参考时刻：2026-06-15 12:00 北京时间。
const NOW = new Date("2026-06-15T12:00:00+08:00");

test("未审核通过的优惠一律返回 pending", () => {
  for (const reviewStatus of ["pending", "rejected"] as const) {
    const deal = makeDeal({ reviewStatus, startsAt: "2026-06-01", endsAt: "2026-06-30" });
    assert.equal(dealStatus(deal, NOW), "pending");
  }
});

test("已通过但尚未开始返回 upcoming", () => {
  const deal = makeDeal({ startsAt: "2026-07-01", endsAt: "2026-07-31" });
  assert.equal(dealStatus(deal, NOW), "upcoming");
});

test("开始日期当天零点即视为已开始（不再 upcoming）", () => {
  const deal = makeDeal({ startsAt: "2026-06-15", endsAt: "2026-06-30" });
  // NOW 是当天 12:00，晚于当天 00:00，应已开始
  assert.equal(dealStatus(deal, NOW), "active");
});

test("开始日期前一刻仍是 upcoming", () => {
  const deal = makeDeal({ startsAt: "2026-06-16", endsAt: "2026-06-30" });
  const justBefore = new Date("2026-06-15T23:59:59+08:00");
  assert.equal(dealStatus(deal, justBefore), "upcoming");
});

test("结束日期已过返回 ended", () => {
  const deal = makeDeal({ startsAt: "2026-06-01", endsAt: "2026-06-10" });
  assert.equal(dealStatus(deal, NOW), "ended");
});

test("结束日期当天 23:59:59 仍未结束", () => {
  const deal = makeDeal({ startsAt: "2026-06-01", endsAt: "2026-06-15" });
  const endOfDay = new Date("2026-06-15T23:59:59+08:00");
  assert.notEqual(dealStatus(deal, endOfDay), "ended");
});

test("结束日期次日零点后返回 ended", () => {
  const deal = makeDeal({ startsAt: "2026-06-01", endsAt: "2026-06-15" });
  const nextDay = new Date("2026-06-16T00:00:01+08:00");
  assert.equal(dealStatus(deal, nextDay), "ended");
});

test("距结束不足 7 天返回 ending_soon", () => {
  const deal = makeDeal({ startsAt: "2026-06-01", endsAt: "2026-06-20" });
  // NOW 为 06-15 12:00，距 06-20 23:59:59 约 5.5 天
  assert.equal(dealStatus(deal, NOW), "ending_soon");
});

test("距结束刚好超过 7 天返回 active", () => {
  const deal = makeDeal({ startsAt: "2026-06-01", endsAt: "2026-06-23" });
  // 距 06-23 23:59:59 约 8.5 天
  assert.equal(dealStatus(deal, NOW), "active");
});

test("ending_soon 的 7 天边界（含）", () => {
  const deal = makeDeal({ startsAt: "2026-06-01", endsAt: "2026-06-30" });
  // 取一个距结束恰好等于 7 天的时刻：06-30 23:59:59 - 7天 = 06-23 23:59:59
  const exactlySevenDays = new Date("2026-06-23T23:59:59+08:00");
  assert.equal(dealStatus(deal, exactlySevenDays), "ending_soon");
});

test("无开始/结束日期的已通过优惠返回 active", () => {
  const deal = makeDeal({ startsAt: null, endsAt: null });
  assert.equal(dealStatus(deal, NOW), "active");
});

test("只有结束日期、距今很远返回 active", () => {
  const deal = makeDeal({ startsAt: null, endsAt: "2026-12-31" });
  assert.equal(dealStatus(deal, NOW), "active");
});
