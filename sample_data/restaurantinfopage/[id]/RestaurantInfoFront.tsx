"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getStarRating,
  getCountryFlagPng,
  parseRatingValue,
} from "@/app/gate/restaurantpagegate";
import { normalizeCategoryLabel } from "@/app/gate/categories";

import {
  getAuthSessionProfile,
  getAuthSessionToken,
} from "@/app/lib/authSession";
import { VSModalPaged } from "@/app/lib/authAlerts";

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
  rating?: number; // média (0..5)
  starsgiven?: number;
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
  CATEGORY_ICON_MAP[category] ?? { src: "🍽️", alt: "Category" };

/* ======================
   COMPONENT
====================== */
export default function RestaurantInfoFront({ restaurant, reviews }: Props) {
  const router = useRouter();

  useEffect(() => {
    const existing = getAuthSessionToken();
    if (!existing) router.replace("/authview");
  }, [router]);

  // Reviews locais (para atualizar UI imediatamente após submit)
  const [localReviews, setLocalReviews] = useState<Review[]>(reviews);
  useEffect(() => setLocalReviews(reviews), [reviews]);

  // Média baseada nos reviews
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

  // ✅ hasJapaneseCategory (corretamente derivado de categoryList)
  const hasJapaneseCategory = useMemo(() => {
    return categoryList.some((category) => category.toLowerCase() === "japanese");
  }, [categoryList]);

  // Imagem "trending" por categoria (inclui japanese e italian/pizza)
  const categoryTrendingImage = useMemo(() => {
    const normalized = categoryList.map((category) => category.toLowerCase());
    const restaurantName = (restaurant.name ?? "").trim().toLowerCase();

    if (restaurantName.trim().toLowerCase() === "chick-fil-a") {
      return {
        src: "/0586AF72-0F8A-4EAC-A697-9C408C658DAD.png",
        alt: "Chick-fil-A decoration",
      };
    }

    if (normalized.includes("japanese")) {
      return {
        src: "/B269115E-1246-4965-A561-43E3603A146B_1_105_c.jpeg",
        alt: "Japanese decoration",
      };
    };

    if (normalized.includes("chicken shop")) {
      return {
        src: "/DB00C326-E99C-4D0A-91BE-C9A3A63E8719.png",
        alt: "Japanese decoration",
      };
    };

    if (normalized.includes("italian/pizza")) {
      return {
        src: "/14EDD76F-9F43-4D38-A1D0-8FA09D82B362_1_105_c.jpeg",
        alt: "Italian decoration",
      }
    };
    if (normalized.includes("mexican")) {
       return {
        src: "/Firefly_Flux_Consegue retirar os fornos atras do homem de chapeu e inserir tabuas de nachos, guaca 349340.jpg",
        alt: "Mexican decoration",
      };
    };
     if (normalized.includes("fast food")) {
       return {
        src: "/F4A6567D-AFD8-4AEC-9586-B876FB5CF351.png",
        alt: "fast food decoration",
      };
    };
     if (normalized.includes("vegan")) {
       return {
        src: "/C38E8955-A618-43EE-931F-71E84DC14161.png",
        alt: "vegan decoration",
      };
    };
     if (normalized.includes("açai & bowls")) {
       return {
        src: "/Firefly_GeminiFlash_CONSEGUE recriar a cena do restaurante para mim só que com seguinte temática de culin 81657.png",
        alt: "açai & bowls decoration",
      };
    };
       if (normalized.includes("arabic")) {
       return {
        src: "/8CB1B9C1-CDF2-4F7D-814E-58DDBAA7EA98.png",
        alt: "Arabic decoration",
      };
    };
      if (normalized.includes("bakery/cafe")) {
       return {
        src: "/9E143867-75FF-4C66-818F-E84B5465ADBC.png",
        alt: "Arabic decoration",
      };
    };
      if (normalized.includes("argentine")) {
       return {
        src: "/60E7FCD8-D92C-49FF-A9D9-53EFF9737671Copia(2).png",
        alt: "Argentine decoration",
      };
    };
    
          if (normalized.includes("sandwich shop")) {
       return {
        src: "/Firefly_GeminiFlash_Consegue gerar a mesma imagem porém com a seguinte tematica- Sandwich Shop- 998742.png",
        alt: "Argentine decoration",
      };
    };
         if (normalized.includes("desserts")) {
       return {
        src: "/Firefly_GeminiFlash_CONSEGUE recriar a cena do restaurante para mim só que com seguinte temática de culin 827994.png",
        alt: "Argentine decoration",
      };
    };
             if (normalized.includes("bar")) {
       return {
        src: "/ChatGPT Image 23 de fev. de 2026, 11_20_17.png",
        alt: "Argentine decoration",
      };
    };
    if (normalized.includes("casual/local") && countryName.trim().toLowerCase() === "usa") {
      return {
        src: "/Sem título - 19 de fevereiro de 2026 às 19.15.50 (8).PNG",
        alt: "Casual local USA decoration",
      };
    }
        if (normalized.includes("casual/local") && countryName.trim().toLowerCase() === "brasil") {
      return {
        src: "/capbrasil2.jpg",
        alt: "Casual local BR decoration",
      };
    }
    
    return null;
     }, [categoryList, countryName, restaurant.name]);

  const CARD = "rounded-3xl border border-black/50 bg-white";
  const BADGE =
    "inline-flex items-center gap-3 rounded-2xl border border-black/50 bg-white px-4 py-2";

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
    if (!backgroundImage) return undefined;

    return {
      backgroundImage: `url("${backgroundImage}")`,
      backgroundPosition: "left top",
      backgroundRepeat: "repeat",
      backgroundSize: "220px 220px",
    } as const;
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
      const response = await fetch(`/api/restaurants/${restaurant.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: reviewRating,
          text: reviewText.trim(),
          userDisplayName: profileEmail,
          userEmail: profileEmail,
        }),
      });

      if (!response.ok) {
        const errorBody = (await response.json()) as { error?: string };
        throw new Error(errorBody?.error || "Unable to submit commentary.");
      }

      const payload = (await response.json()) as { review?: Review };
      if (!payload.review) throw new Error("Unable to submit commentary.");

      setLocalReviews((prev) => [payload.review!, ...prev]);
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
        <header className={[CARD, "relative mb-6"].join(" ")}>
          <div className="grid gap-6 p-6 md:grid-cols-[300px_1fr]">
            {/* COLUNA ESQUERDA → IMAGEM */}
            <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-white">
              {restaurant.photo ? (
                <img
                  src={restaurant.photo}
                  alt={restaurant.name ?? "Restaurant"}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>

            {/* COLUNA DIREITA → INFO */}
            <div className="flex flex-col gap-4">
              {/* NOME */}
              <div className={[BADGE, "w-fit"].join(" ")}>
                <h1 className="text-3xl font-extrabold text-black">
                  {restaurant.name ?? "Restaurant"}
                </h1>
              </div>

              {/* ENDEREÇO + BANDEIRA */}
              <div className={BADGE}>
                {flag ? (
                  <img
                    src={flag.src}
                    alt={flag.alt}
                    className="h-6 w-9 rounded-md"
                  />
                ) : null}
                <span className="font-semibold text-black/80">{locationLine}</span>
              </div>

              {/* STARS + NOTA */}
              <div className={BADGE}>
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

        {/* ===== TRENDING IMAGE (usa a categoria, incluindo japanese) ===== */}
        {categoryTrendingImage ? (
          <div className={[CARD, "mb-6 h-80 p-4"].join(" ")}>
            <img
              src={categoryTrendingImage.src}
              alt={categoryTrendingImage.alt}
              className="h-full w-full rounded-2xl border border-black/50 object-cover"
            />
          </div>
        ) : null}

        {/* ===== CATEGORIES + MAP ===== */}
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* CATEGORIES */}
          <div className={[CARD, "p-6 shadow-sm"].join(" ")}>
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

          {/* MAP */}
          <div className={[CARD, "p-6 shadow-sm"].join(" ")}>
            <h2 className="text-xl font-extrabold text-black">Mini map</h2>

            {locationLine ? (
              <div className="mt-4 overflow-hidden rounded-3xl border border-black/50">
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
        <section className={[CARD, "mt-6 p-6 shadow-sm"].join(" ")}>
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
            className="mt-6 grid gap-4 rounded-2xl border border-black/50 bg-white p-4"
          >
            <div className="grid gap-2">
              <label
                className="text-sm font-semibold text-black/80"
                htmlFor="rating"
              >
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
              <label
                className="text-sm font-semibold text-black/80"
                htmlFor="commentary"
              >
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

            {submitError ? (
              <div className="text-sm text-red-600">{submitError}</div>
            ) : null}

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
                <li key={review.id} className={[CARD, "p-4"].join(" ")}>
                  <div className="flex items-center gap-3">
                    {review.userPhoto ? (
                      <img
                        src={review.userPhoto}
                        className="h-10 w-10 rounded-full object-cover"
                        alt=""
                      />
                    ) : null}

                    <div>
                      <div className="font-semibold">
                        {review.userDisplayName ?? "Anonymous"}
                      </div>
                      <div className="text-amber-400 text-sm">
                        {"★".repeat(
                          Math.round(
                            parseRatingValue(review.rating ?? review.grade ?? 0)
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-black/80">
                    {review.text ?? "No comment"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
