"use client";

export const parseRatingValue = (rating: unknown) => {
  if (typeof rating === "number" && !Number.isNaN(rating)) return rating;
  if (typeof rating === "string") {
    const normalized = rating.trim().replace(",", ".");
    const match = normalized.match(/-?\d+(\.\d+)?/);
    if (match) {
      const parsed = Number(match[0]);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
  }
  return 0;
};
