"use client";

import {
  getStarRating,
  getCountryFlagPng,
  parseRatingValue,
} from "@/app/gate/restaurantpagegate";
import { normalizeCategoryLabel } from "@/app/gate/categories";

import { TEXT_GLOW, FILTER_GLOW_LINE, CARD_GLASS } from "@/app/lib/uiToken";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAuthSessionProfile,
  getAuthSessionToken,
} from "@/app/lib/authSession";
import { VSModalPaged } from "@/app/lib/authAlerts";
import {router} from "next/client";
import {useRouter} from "next/navigation";
/* ======================
   TYPES
====================== */
type Review = {
  id: string;
  rating?: number;
  grade?: number;
  text?: string;
  userDisplayName?: string;
  userPhoto?: string;
  createdAt?: string;
  restaurantId?: string;
};

type Restaurant = {
  id: string;
  name?: string;
  photo?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  categories?: string[];
  rating?: number;      // aqui vamos guardar a MÉDIA (0..5)
  starsgiven?: number;  // opcional: pode virar contador depois
};

/* ======================
   PROPS
====================== */
type Props = {
  restaurant: Restaurant;
  reviews: Review[];
};

const CATEGORY_ICON_MAP: Record<string, { src: string; alt: string }> = {
  "Fast Food": { src: "🍔", alt: "Fast food" },
  "Italian/Pizza": { src: "🍕", alt: "Italian/Pizza" },
  Japanese: { src: "🍣", alt: "Japanese" },
  Mexican: { src: "🌮", alt: "Mexican" },
  "Sandwich Shop": { src: "🥪", alt: "Sandwich Shop" },
  Desserts: { src: "🍨", alt: "Desserts" },
  "Bakery/Cafe": { src: "🥐", alt: "Bakery/Cafe" },
  Grocery: { src: "🛒", alt: "Grocery" },
  Vegan: { src: "🥗", alt: "Vegan" },
  Argentine: { src: "🇦🇷", alt: "Argentine" },
  Barbeque: { src: "🍖", alt: "Barbeque" },
  "Chicken Shop": { src: "🍗", alt: "Chicken Shop" },
  Bar: { src: "🍸", alt: "Bar" },
  "Açai & Bowls": { src: "🥣", alt: "Açai & Bowls" },
  "Casual/Local": { src: "🍽️", alt: "Casual/Local" },
  Arabic: { src: "🥙", alt: "Arabic" },
};

const getCategoryIcon = (category: string) =>
    CATEGORY_ICON_MAP[category] ?? {
      src: "🍽️",
      alt: "Category",
    };
/* ======================
   COMPONENT
====================== */
export default function RestaurantInfoFront({ restaurant, reviews }: Props) {
  const router = useRouter();

  useEffect(() => {
    const existing = getAuthSessionToken();
    if (!existing) {
      router.replace("/authview");
      return;
    }
  }, [router]);
  // Reviews locais (pra renderizar imediatamente após submit)
  const [localReviews, setLocalReviews] = useState<Review[]>(reviews);

  useEffect(() => setLocalReviews(reviews), [reviews]);


  // Média baseada nos reviews (fonte mais “real”)
  const reviewAverage = useMemo(() => {
    if (!localReviews.length) return null;
    const total = localReviews.reduce(
        (sum, r) => sum + parseRatingValue(r.rating ?? r.grade ?? 0),
        0
    );
    return total / localReviews.length;
  }, [localReviews]);

  // Valor exibido: se tiver reviewAverage usa ela; senão cai no restaurant.rating
  const ratingValue = reviewAverage ?? parseRatingValue(restaurant.rating ?? 0);
  const { rounded, display } = getStarRating(ratingValue);

  const countryName = restaurant.country ?? "";
  const flag = getCountryFlagPng(countryName);

  const locationLine = [
    restaurant.address,
    restaurant.city,
    restaurant.state,
    restaurant.country,
  ]
      .filter(Boolean)
      .join(", ");

  const categoryList = useMemo(() => {
    return (restaurant.categories ?? [])
        .map((category) => normalizeCategoryLabel(String(category)))
        .filter(Boolean);
  }, [restaurant.categories]);

  const latestReviews = useMemo(() => {
    return [...localReviews].sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });
  }, [localReviews]);

  // Form state
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!reviewText.trim()) {
      void VSModalPaged({
        title: "Missing information",
        messages: ["Please add your commentary."],
        tone: "error",
        confirmText: "Ok",
      });
      return;
    }

    const profile = getAuthSessionProfile();
    const profileEmail = profile.email?.trim();

    if (!profileEmail) {
      setSubmitError("Please sign in to leave commentary.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch(
          `/api/restaurants/${restaurant.id}/reviews`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              rating: reviewRating,
              text: reviewText.trim(),
              userDisplayName: profileEmail,
              userEmail: profileEmail,
            }),
          }
      );

      if (!response.ok) {
        const errorBody = (await response.json()) as { error?: string };
        throw new Error(errorBody?.error || "Unable to submit commentary.");
      }

      const payload = (await response.json()) as { review?: Review };
      const newReview = payload.review;
      if (!newReview) {
        throw new Error("Unable to submit commentary.");
      }

      // 2) atualiza UI local imediatamente
      setLocalReviews((prev) => [newReview, ...prev]);
      setReviewRating(0);
      setReviewText("");
    } catch (err: any) {
      setSubmitError(err?.message || "Unable to submit commentary.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-6 py-8">
          {/* ===== HEADER ===== */}
          <header
              className={[
                "relative overflow-hidden rounded-3xl border border-white/18",
                "bg-white/[0.06] backdrop-blur-2xl mb-6",
                FILTER_GLOW_LINE,
              ].join(" ")}
          >
            <div className="relative grid gap-6 p-6 md:grid-cols-[300px_1fr]">
              <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-white/12 bg-white/5">
                {restaurant.photo ? (
                    <img
                        src={restaurant.photo}
                        alt={restaurant.name ?? "Restaurant"}
                        className="h-full w-full object-cover"
                    />
                ) : null}
              </div>

              <div>
                <h1 className={`text-3xl font-extrabold ${TEXT_GLOW}`}>
                  {restaurant.name}
                </h1>

                <div className="mt-3 flex items-center gap-3">
                  {flag && (
                      <img
                          src={flag.src}
                          alt={flag.alt}
                          className="h-6 w-9 rounded-md ring-1 ring-white/20"
                      />
                  )}
                  <span className="font-semibold">{locationLine}</span>
                </div>

                <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/18 bg-white/[0.10] px-4 py-2">
                <span className="text-amber-400 font-bold text-lg">
                  {"★".repeat(rounded)}
                </span>
                  <span className="text-sm text-white/70">
                  {display.toFixed(1)} / 5
                </span>
                </div>
              </div>
            </div>
          </header>

          <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className={`${CARD_GLASS} p-6`}>
              <h2 className={`text-xl font-extrabold ${TEXT_GLOW}`}>
                Restaurant categories
              </h2>
              {categoryList.length === 0 ? (
                  <p className="mt-3 text-white/70">No categories available.</p>
              ) : (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {categoryList.map((category) => (
                        <span
                            key={category}
                            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-4 py-2 text-sm font-semibold text-white/90"
                        >
                    <span aria-hidden="true">{getCategoryIcon(category).src}</span>
                    <span>{category}</span>
                  </span>
                    ))}
                  </div>
              )}
            </div>

            <div className={`${CARD_GLASS} p-6`}>
              <h2 className={`text-xl font-extrabold ${TEXT_GLOW}`}>Mini map</h2>
              {locationLine ? (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/15">
                    <iframe
                        title="Restaurant location map"
                        src={`https://www.google.com/maps?q=${encodeURIComponent(
                            locationLine
                        )}&output=embed`}
                        className="h-56 w-full"
                        loading="lazy"
                    />
                  </div>
              ) : (
                  <p className="mt-3 text-white/70">No address available.</p>
              )}
            </div>
          </section>

          {/* ===== REVIEWS ===== */}
          <section className={`${CARD_GLASS} p-6`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className={`text-xl font-extrabold ${TEXT_GLOW}`}>Commentary</h2>
                <p className="mt-1 text-white/70 text-sm">
                  Share your latest thoughts and read the newest updates.
                </p>
              </div>
              <div className="text-sm text-white/60">
                {latestReviews.length} comment{latestReviews.length === 1 ? "" : "s"}
              </div>
            </div>

            <form
                onSubmit={handleSubmit}
                className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
            >
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-white/80" htmlFor="rating">
                  Rating
                </label>
                <select
                    id="rating"
                    value={reviewRating}
                    onChange={(event) => setReviewRating(Number(event.target.value))}
                    className="rounded-xl bg-white/90 px-3 py-2 text-black"
                >
                  {[0, 1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {value} star{value === 1 ? "" : "s"}
                      </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-white/80" htmlFor="commentary">
                  Your commentary
                </label>
                <textarea
                    id="commentary"
                    value={reviewText}
                    onChange={(event) => setReviewText(event.target.value)}
                    rows={4}
                    placeholder="Share your thoughts about this restaurant..."
                    className="rounded-xl bg-white/90 px-3 py-2 text-black"
                />
              </div>

              {submitError ? <div className="text-sm text-red-300">{submitError}</div> : null}

              <button
                  disabled={submitting}
                  className="w-full rounded-xl border border-white/20 bg-white/[0.12] px-4 py-2 font-semibold text-white hover:bg-white/[0.18] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit commentary"}
              </button>
            </form>

            {latestReviews.length === 0 ? (
                <p className="mt-6 text-white/70">No commentary yet.</p>
            ) : (
                <ul className="mt-6 space-y-4">
                  {latestReviews.map((review) => (
                      <li
                          key={review.id}
                          className="rounded-2xl border border-white/12 bg-white/[0.06] p-4"
                      >
                        <div className="flex items-center gap-3">
                          {review.userPhoto && (
                              <img
                                  src={review.userPhoto}
                                  className="h-10 w-10 rounded-full object-cover"
                                  alt=""
                              />
                          )}
                          <div>
                            <div className="font-semibold">
                              {review.userDisplayName ?? "Anonymous"}
                            </div>
                            <div className="text-amber-400 text-sm">
                              {"★".repeat(
                                  Math.round(parseRatingValue(review.rating ?? review.grade ?? 0))
                              )}
                            </div>
                          </div>
                        </div>

                        <p className="mt-3 text-sm text-white/80">{review.text ?? "No comment"}</p>
                      </li>
                  ))}
                </ul>
            )}
          </section>
        </div>
      </div>
  );
}