#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outputPath = path.join(root, "src", "data", "exchange-rates.json");
const url =
  "https://data-api.ecb.europa.eu/service/data/EXR/D.USD+CNY.EUR.SP00.A?lastNObservations=1&format=csvdata";
const response = await fetch(url, {
  headers: { "user-agent": "AI-Sites-Hub-Exchange-Rate-Updater/1.0" },
});
if (!response.ok) throw new Error(`ECB API 返回 HTTP ${response.status}`);

const csv = await response.text();
const lines = csv.trim().split(/\r?\n/);
const headers = lines[0].split(",");
const currencyIndex = headers.indexOf("CURRENCY");
const dateIndex = headers.indexOf("TIME_PERIOD");
const valueIndex = headers.indexOf("OBS_VALUE");
if ([currencyIndex, dateIndex, valueIndex].some((index) => index < 0)) {
  throw new Error("ECB CSV 缺少预期字段");
}

const values = {};
for (const line of lines.slice(1)) {
  const columns = line.split(",");
  values[columns[currencyIndex]] = {
    date: columns[dateIndex],
    value: Number(columns[valueIndex]),
  };
}
if (!values.USD || !values.CNY) throw new Error("ECB API 未返回 USD 与 CNY");

const observedAt = values.USD.date < values.CNY.date ? values.USD.date : values.CNY.date;
const rate = Number((values.CNY.value / values.USD.value).toFixed(4));
const existing = JSON.parse(await readFile(outputPath, "utf8"));
const id = `usd-cny-${observedAt}`;
const entry = {
  id,
  base: "USD",
  quote: "CNY",
  rate,
  observedAt,
  source: "European Central Bank",
  sourceUrl: "https://data.ecb.europa.eu/data/datasets/EXR",
  eurUsd: values.USD.value,
  eurCny: values.CNY.value,
};
const next = existing.some((item) => item.id === id)
  ? existing.map((item) => (item.id === id ? entry : item))
  : [...existing, entry];
await writeFile(outputPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
console.log(`ECB 汇率已更新：1 USD = ${rate} CNY（${observedAt}）`);
