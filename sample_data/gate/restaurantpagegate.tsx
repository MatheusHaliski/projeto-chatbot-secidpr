import { normalizeCategoryLabel } from "@/app/gate/categories";

/* =========================
   TYPES
========================= */
export type Restaurant = {
    id: string;
    name?: string;

    photo?: string;
    photoPath?: string;
    imagePath?: string;
    storagePath?: string;

    fallbackApplied?: boolean;
    fallbackapplied?: boolean;

    rating?: number;
    grade?: number;
    starsgiven?: number;

    country?: string;
    state?: string;
    city?: string;

    address?: string;
    street?: string;

    categories?: unknown;
    category?: string;
};

/* =========================
   CATEGORY SETS
========================= */
export const CAFE_CATEGORY_SET = new Set([
    "cafes",
    "cafeteria",
    "hong kong style cafe",
    "themed cafes",
]);

export const SANDWICH_CATEGORY_SET = new Set([
    "sandwiches",
    "sandwich shop",
    "sandwich shops",
    "sandwiches & wraps",
    "sandwiches and wraps",
]);

/* =========================
   LOCATION
========================= */
const NEW_YORK_ADDRESS_REGEX = /\b\d+\s+[^,]+,?\s*new york\b/i;

export function getNormalizedLocation(restaurant: Restaurant) {
    const sourceAddress = [restaurant.address, restaurant.street]
        .filter(Boolean)
        .join(", ");

    if (sourceAddress && NEW_YORK_ADDRESS_REGEX.test(sourceAddress)) {
        return {
            city: "New York",
            state: "NY",
            country: "USA",
        };
    }

    return {
        city: restaurant.city,
        state: restaurant.state,
        country: restaurant.country,
    };
}

/* =========================
   CATEGORIES
========================= */
export function getCategoryValues(restaurant: Restaurant): string[] {
    if (Array.isArray(restaurant.categories)) {
        return restaurant.categories
            .map((item) => normalizeCategoryLabel(String(item)))
            .filter(Boolean);
    }

    if (typeof restaurant.categories === "string") {
        return restaurant.categories
            .split(",")
            .map((item) => normalizeCategoryLabel(item))
            .filter(Boolean);
    }

    if (restaurant.category) {
        return [normalizeCategoryLabel(String(restaurant.category))];
    }

    return [];
}

export function hasCafeCategory(r: Restaurant): boolean {
    return getCategoryValues(r).some((c) =>
        CAFE_CATEGORY_SET.has(c.toLowerCase())
    );
}

export function hasSandwichCategory(r: Restaurant): boolean {
    return getCategoryValues(r).some((c) =>
        SANDWICH_CATEGORY_SET.has(c.toLowerCase())
    );
}

/* =========================
   FALLBACK IMAGE
========================= */
export function getFallbackImageForRestaurant(
    restaurant: Restaurant
): string | null {
    const fallbackApplied = Boolean(
        restaurant.fallbackApplied ?? restaurant.fallbackapplied
    );

    if (!fallbackApplied) return null;
    if (hasSandwichCategory(restaurant)) return "/fallbacksandwich.png";
    if (hasCafeCategory(restaurant)) return "/fallbackcafe.png";
    return null;
}

/* =========================
   RATING
========================= */
export function parseRatingValue(rating: unknown): number {
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
}

export function getStarRating(rating: unknown) {
    const safe = parseRatingValue(rating);
    return {
        rounded: Math.max(0, Math.min(5, Math.round(safe))),
        display: Math.max(0, Math.min(5, safe)),
    };
}

/* =========================
   FLAGS
========================= */
export type FlagAsset = { alt: string; src: string };

export const COUNTRY_FLAG_PNG: Record<string, FlagAsset> = {
    brasil: { alt: "Brasil", src: "/brasil.png" },
    brazil: { alt: "Brasil", src: "/brasil.png" },
    br: { alt: "Brasil", src: "/brasil.png" },

    canada: { alt: "Canada", src: "/canada.png" },
    ca: { alt: "Canada", src: "/canada.png" },

    "estados unidos": { alt: "Estados Unidos", src: "/estados-unidos.png" },
    "united states": { alt: "Estados Unidos", src: "/estados-unidos.png" },
    usa: { alt: "Estados Unidos", src: "/estados-unidos.png" },
};

export function normalizeKey(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[._]/g, "-");
}

export function getCountryFlagPng(
    countryName?: string | null
): FlagAsset | null {
    if (!countryName) return null;
    return COUNTRY_FLAG_PNG[normalizeKey(countryName)] ?? null;
}
