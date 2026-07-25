import type { Deal, DealStatus } from "./schema";

const DAY_MS = 86_400_000;

function dateAtChinaMidnight(value: string) {
  return new Date(`${value}T00:00:00+08:00`);
}

function dateAtChinaDayEnd(value: string) {
  return new Date(`${value}T23:59:59+08:00`);
}

export function dealStatus(deal: Deal, now = new Date()): DealStatus {
  if (deal.reviewStatus !== "approved") return "pending";
  if (deal.startsAt && now < dateAtChinaMidnight(deal.startsAt)) return "upcoming";
  if (deal.endsAt && now > dateAtChinaDayEnd(deal.endsAt)) return "ended";
  if (deal.endsAt) {
    const daysLeft = (dateAtChinaDayEnd(deal.endsAt).getTime() - now.getTime()) / DAY_MS;
    if (daysLeft <= 7) return "ending_soon";
  }
  return "active";
}
