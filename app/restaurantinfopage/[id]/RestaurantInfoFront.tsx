"use client";

import {
  getStarRating,
  getCountryFlagPng,
  parseRatingValue,
} from "@/app/gate/restaurantpagegate";
import { normalizeCategoryLabel } from "@/app/gate/categories";

import { FILTER_GLOW_LINE } from "@/app/lib/uiToken";
import { useEffect, useMemo, useState } from "react";
import {
  getAuthSessionProfile,
  getAuthSessionToken,
} from "@/app/lib/authSession";
import { VSModalPaged } from "@/app/lib/authAlerts";
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

  const hasJapaneseCategory = useMemo(
    () => categoryList.some((category) => category.toLowerCase() === "japanese"),
    [categoryList]
  );

  const pageBackgroundStyle = useMemo(() => {
    const categoryKey = categoryList[0]?.trim().toLowerCase();

    const categoryBackgroundMap: Record<string, string> = {
      japanese: "/9BE60003-166D-4946-AA7D-18A1B1F5827D.png",
      "bakery/cafe": "/B8A1086C-174F-4CAA-BCE5-A375FBFD2DB1.png",
      "fast food": "/34354493-DF0F-42A9-85BF-B1680396B151.png",
      desserts: "/CA9E9EFC-CE82-4D18-BF5F-F64426CC0D37.png",
      "italian/pizza": "/9C5C070B-47CE-4043-A29D-506AE19535FA.png",
      "chicken shop": "/1823E80A-4EDD-4EBC-B510-88775C2D57B1.png",
      mexican: "/9C7464B5-579E-4D0D-947F-B24A4D449097.png",
      arabic: "/D03D8233-DBB7-43DD-8590-986225967093.png",
      "sandwich shop": "/1F8BA437-D9EF-45D6-91B4-673495AA4A57_1_105_c.jpeg",
      barbeque: "/DD16FA97-1CD2-4A0C-A8CE-210FF81705F5_1_105_c.jpeg",
      "açai & bowls": "/13C7D1E7-948D-42DB-846F-8D5AEA265881.jpeg",
      argentine: "/54AEB9FC-4CD5-4E03-9460-05DE0FBA1C1A.jpeg",
      vegan: "/90237925-DE31-4DFF-9F26-46E35A630991.jpeg",
    };

    const backgroundImage = categoryKey ? categoryBackgroundMap[categoryKey] : undefined;
    if (!backgroundImage) {
      return undefined;
    }

    return {
      backgroundImage: `url("${backgroundImage}")`,
      backgroundPosition: "left top",
      backgroundRepeat: "repeat",
      backgroundSize: "220px 220px",
    };
  }, [categoryList]);

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
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "Unable to submit commentary."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
      <div className="min-h-screen w-full text-black" style={pageBackgroundStyle}>
        <div className="mx-auto max-w-6xl px-6 py-8">
          {/* ===== HEADER ===== */}
          <header
              className={[
                "relative overflow-hidden rounded-3xl border border-white/18",
                "bg-white/95 backdrop-blur-2xl mb-6",
                FILTER_GLOW_LINE,
              ].join(" ")}
          >
            <div className="relative grid gap-6 p-6 md:grid-cols-[300px_1fr]">
              <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-black/10 bg-white">
                {restaurant.photo ? (
                    <img
                        src={restaurant.photo}
                        alt={restaurant.name ?? "Restaurant"}
                        className="h-full w-full object-cover"
                    />
                ) : null}
              </div>

              <div>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <h1 className="text-3xl font-extrabold text-black">
                    {restaurant.name}
                  </h1>

                  {hasJapaneseCategory ? (
                    <img
                      src="/B269115E-1246-4965-A561-43E3603A146B_1_105_c.jpeg"
                      alt="Japanese decoration"
                      className="h-20 w-20 rounded-xl border border-black/15 object-cover"
                    />
                  ) : null}
                </div>

                <div className="mt-3 flex items-center gap-3">
                  {flag && (
                      <img
                          src={flag.src}
                          alt={flag.alt}
                          className="h-6 w-9 rounded-md ring-1 ring-white/20"
                      />
                  )}
                  <span className="font-semibold text-black/80">{locationLine}</span>
                </div>

                <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-black/15 bg-white px-4 py-2">
                <span className="text-amber-400 font-bold text-lg">
                  {"★".repeat(rounded)}
                </span>
                  <span className="text-sm text-black/70">
                  {display.toFixed(1)} / 5
                </span>
                </div>
              </div>
            </div>
          </header>

          <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-extrabold text-black">
                Restaurant categories
              </h2>
              {categoryList.length === 0 ? (
                  <p className="mt-3 text-black/70">No categories available.</p>
              ) : (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {categoryList.map((category) => (
                        <span
                            key={category}
                            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black/90"
                        >
                    <span aria-hidden="true">{getCategoryIcon(category).src}</span>
                    <span>{category}</span>
                  </span>
                    ))}
                  </div>
              )}
            </div>

            <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-extrabold text-black">Mini map</h2>
              {locationLine ? (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-black/15">
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
                  <p className="mt-3 text-black/70">No address available.</p>
              )}
            </div>
          </section>

          {/* ===== REVIEWS ===== */}
          <section className="mt-6 rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-black">Commentary</h2>
                <p className="mt-1 text-black/70 text-sm">
                  Share your latest thoughts and read the newest updates.
                </p>
              </div>
              <div className="text-sm text-black/60">
                {latestReviews.length} comment{latestReviews.length === 1 ? "" : "s"}
              </div>
            </div>

            <form
                onSubmit={handleSubmit}
                className="mt-6 grid gap-4 rounded-2xl border border-black/10 bg-white p-4"
            >
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-black/80" htmlFor="rating">
                  Rating
                </label>
                <select
                    id="rating"
                    value={reviewRating}
                    onChange={(event) => setReviewRating(Number(event.target.value))}
                    className="rounded-xl border border-black/10 bg-white px-3 py-2 text-black"
                >
                  {[0, 1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {value} star{value === 1 ? "" : "s"}
                      </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-black/80" htmlFor="commentary">
                  Your commentary
                </label>
                <textarea
                    id="commentary"
                    value={reviewText}
                    onChange={(event) => setReviewText(event.target.value)}
                    rows={4}
                    placeholder="Share your thoughts about this restaurant..."
                    className="rounded-xl border border-black/10 bg-white px-3 py-2 text-black"
                />
              </div>

              {submitError ? <div className="text-sm text-red-300">{submitError}</div> : null}

              <button
                  disabled={submitting}
                  className="w-full rounded-xl border border-black/15 bg-black px-4 py-2 font-semibold text-white hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit commentary"}
              </button>
            </form>

            {latestReviews.length === 0 ? (
                <p className="mt-6 text-black/70">No commentary yet.</p>
            ) : (
                <ul className="mt-6 space-y-4">
                  {latestReviews.map((review) => (
                      <li
                          key={review.id}
                          className="rounded-2xl border border-black/12 bg-white p-4"
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

                        <p className="mt-3 text-sm text-black/80">{review.text ?? "No comment"}</p>
                      </li>
                  ))}
                </ul>
            )}
          </section>
        </div>
      </div>
  );
}
