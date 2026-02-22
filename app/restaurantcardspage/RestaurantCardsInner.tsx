"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";

import {
    getCategoryValues,
    getCountryFlagPng,
    getFallbackImageForRestaurant,
    getNormalizedLocation,
    getStarRating,
    parseRatingValue,
    type Restaurant,
} from "@/app/gate/restaurantpagegate";

import {
    FILTER_GLOW_BAR,
    FILTER_GLOW_LINE,
    GLOW_BAR,
    GLOW_LINE,
    TEXT_GLOW,
    GLASS_INPUT,
} from "@/app/lib/uiToken";

import { SearchSelect } from "@/app/restaurantcardspage/selectelement";
import { firebaseAuthGate } from "@/app/gate/firebaseClient";
import { VSModalPaged } from "@/app/lib/authAlerts";
import {
    FOOD_CATEGORIES,
    getCategoryIcon,
    normalizeCategoryLabel,
} from "@/app/gate/categories";
import {
    adaptUser,
    type AuthUser,
    getUserLabel,
    getUserPhotoUrl,
} from "@/app/authview/AuthAdapter";
import {
    clearAuthSessionProfile,
    clearAuthSessionToken,
    getAuthSessionProfile,
    type AuthSessionProfile,
} from "@/app/lib/authSession";


import { getAuthSessionToken } from "@/app/lib/authSession";
import { getLS, setLS } from "@/app/lib/SafeStorage";
/* =========================
   Data fetch (Server)
========================= */
type RestaurantsCatalogResponse = {
    catalog: Restaurant[];
};

type RestaurantsByIdsResponse = {
    restaurants: Restaurant[];
};

async function fetchRestaurantsCatalog(): Promise<Restaurant[]> {
    const response = await fetch("/api/restaurants/catalog");
    if (!response.ok) {
        throw new Error("Failed to load restaurant catalog.");
    }
    const payload = (await response.json()) as RestaurantsCatalogResponse;
    return payload.catalog;
}

async function getRestaurantsByIds(): Promise<Restaurant[]>{
    const response = await fetch("/api/restaurants/byIds")
    if (!response.ok) {
        throw new Error("Failed to load restaurant details.");
    }
    const payload = (await response.json()) as RestaurantsByIdsResponse;
    return payload.restaurants;
}
async function fetchRestaurantsByIds(ids: string[]): Promise<Restaurant[]> {
    const response = await fetch("/api/restaurants/byIds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
    });
    if (!response.ok) {
        throw new Error("Failed to load restaurant details.");
    }
    const payload = (await response.json()) as RestaurantsByIdsResponse;
    return payload.restaurants;
}

export function RestaurantCardsInner() {
    const router = useRouter();
    const newcomerAlertStoragePrefix = "restaurantcards_seen_newcomer_alert";

    const { firebaseApp } = firebaseAuthGate();

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    const [catalog, setCatalog] = useState<Restaurant[]>([]);
    const [detailsById, setDetailsById] = useState<Record<string, Restaurant>>({});
    const [missingDetailIds, setMissingDetailIds] = useState<Set<string>>(
        () => new Set()
    );
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState("");
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [authProfile, setAuthProfile] = useState<AuthSessionProfile>(() =>
        getAuthSessionProfile()
    );
    const [user, setUser] = useState<AuthUser | null>(null);
    const [authError, setAuthError] = useState("");

    const [cardImageUrls, setCardImageUrls] = useState<Record<string, string>>({});

    const [nameQuery, setNameQuery] = useState("");
    const [country, setCountry] = useState("");
    const [stateValue, setStateValue] = useState("");
    const [city, setCity] = useState("");
    const [category, setCategory] = useState("");
    const [sortByNameAscending, setSortByNameAscending] = useState(false);

const pageBackgroundStyle = useMemo<CSSProperties | undefined>(() => {
        const selectedCategory = category.trim().toLowerCase();

        if (selectedCategory === "japanese") {
            return {
                backgroundImage: 'url("/9BE60003-166D-4946-AA7D-18A1B1F5827D.png")',
                backgroundPosition: "left top",
                backgroundRepeat: "repeat",
                backgroundSize: "220px 220px",
            };
        }

        if (selectedCategory === "bakery/cafe") {
            return {
                backgroundImage: 'url("/B8A1086C-174F-4CAA-BCE5-A375FBFD2DB1.png")',
                backgroundPosition: "left top",
                backgroundRepeat: "repeat",
                backgroundSize: "220px 220px",
            };
        }

        if (selectedCategory === "fast food") {
            return {
                backgroundImage: 'url("/34354493-DF0F-42A9-85BF-B1680396B151.png")',
                backgroundPosition: "left top",
                backgroundRepeat: "repeat",
                backgroundSize: "220px 220px",
            };
            
        }
     if (selectedCategory === "desserts") {
            return {
                backgroundImage: 'url("/CA9E9EFC-CE82-4D18-BF5F-F64426CC0D37.png")',
                backgroundPosition: "left top",
                backgroundRepeat: "repeat",
                backgroundSize: "220px 220px",
            };
            
        }
      if (selectedCategory === "italian/pizza") {
            return {
                backgroundImage: 'url("/9C5C070B-47CE-4043-A29D-506AE19535FA.png")',
                backgroundPosition: "left top",
                backgroundRepeat: "repeat",
                backgroundSize: "220px 220px",
            };
            
        }
    if (selectedCategory === "chicken shop") {
            return {
                backgroundImage: 'url("/1823E80A-4EDD-4EBC-B510-88775C2D57B1.png")',
                backgroundPosition: "left top",
                backgroundRepeat: "repeat",
                backgroundSize: "220px 220px",
            };
            
        }
     if (selectedCategory === "mexican") {
            return {
                backgroundImage: 'url("/9C7464B5-579E-4D0D-947F-B24A4D449097.png")',
                backgroundPosition: "left top",
                backgroundRepeat: "repeat",
                backgroundSize: "220px 220px",
            };
            
        }
     if (selectedCategory === "arabic") {
            return {
                backgroundImage: 'url("/D03D8233-DBB7-43DD-8590-986225967093.png")',
                backgroundPosition: "left top",
                backgroundRepeat: "repeat",
                backgroundSize: "220px 220px",
            };
            
        }
    if (selectedCategory === "sandwich shop") {
            return {
                backgroundImage: 'url("/1F8BA437-D9EF-45D6-91B4-673495AA4A57_1_105_c.jpeg")',
                backgroundPosition: "left top",
                backgroundRepeat: "repeat",
                backgroundSize: "220px 220px",
            };
            
        }
      if (selectedCategory === "barbeque") {
            return {
                backgroundImage: 'url("/DD16FA97-1CD2-4A0C-A8CE-210FF81705F5_1_105_c.jpeg")',
                backgroundPosition: "left top",
                backgroundRepeat: "repeat",
                backgroundSize: "220px 220px",
            };
            
        }
        if (selectedCategory === "açai & bowls") {
            return {
                backgroundImage: 'url("/13C7D1E7-948D-42DB-846F-8D5AEA265881.jpeg")',
                backgroundPosition: "left top",
                backgroundRepeat: "repeat",
                backgroundSize: "220px 220px",
            };
            
        }
        if (selectedCategory === "argentine") {
            return {
                backgroundImage: 'url("/54AEB9FC-4CD5-4E03-9460-05DE0FBA1C1A.jpeg")',
                backgroundPosition: "left top",
                backgroundRepeat: "repeat",
                backgroundSize: "220px 220px",
            };
            
        }
        if (selectedCategory === "vegan") {
            return {
                backgroundImage: 'url("/90237925-DE31-4DFF-9F26-46E35A630991.jpeg")',
                backgroundPosition: "left top",
                backgroundRepeat: "repeat",
                backgroundSize: "220px 220px",
            };
        }
      if (selectedCategory === "bar") {
            return {
                backgroundImage: 'url("/79980C95-DA0C-4121-A0D4-E4F26F0EF77B.jpeg")',
                backgroundPosition: "left top",
                backgroundRepeat: "repeat",
                backgroundSize: "220px 220px",
            };
        }
     if (selectedCategory === "grocery") {
            return {
                backgroundImage: 'url("/75CE0333-DF13-4DD2-A211-C79DDD4A6072.jpeg")',
                backgroundPosition: "left top",
                backgroundRepeat: "repeat",
                backgroundSize: "220px 220px",
            };
        }
        if (selectedCategory === "casual/local") {
            return {
                backgroundImage: 'url("/B9C14361-6F3F-4378-8099-4109F7098575.png")',
                backgroundPosition: "left top",
                backgroundRepeat: "repeat",
                backgroundSize: "220px 220px",
            };
        }
        return undefined;
    }, [category]);
    
    const [starsFilter, setStarsFilter] = useState("");
    const catalogById = useMemo(() => {
        const entries = catalog.map((restaurant) => [restaurant.id, restaurant] as const);
        return Object.fromEntries(entries);
    }, [catalog]);

    const normalizedCatalog = useMemo(
        () =>
            catalog.map((restaurant) => ({
                ...restaurant,
                ...getNormalizedLocation(restaurant),
            })),
        [catalog]
    );
    const filteredCatalog = useMemo(() => {
        const normalizedQuery = nameQuery.trim().toLowerCase();
        const selectedCategory = category.trim().toLowerCase();
        const minimumStars = starsFilter ? Number(starsFilter) : null;

        return normalizedCatalog.filter((r) => {
            const matchesName = normalizedQuery
                ? String(r.name || "").toLowerCase().includes(normalizedQuery)
                : true;

            const matchesCountry = country ? r.country === country : true;
            const matchesState = stateValue ? r.state === stateValue : true;
            const matchesCity = city ? r.city === city : true;

            const matchesCategory = selectedCategory
                ? getCategoryValues(r).some((value) => value.toLowerCase() === selectedCategory)
                : true;

            const matchesStars =
                minimumStars === null
                    ? true
                    : parseRatingValue(r.starsgiven) >= minimumStars;

            return (
                matchesName &&
                matchesCountry &&
                matchesState &&
                matchesCity &&
                matchesCategory &&
                matchesStars
            );
        });
    }, [
        normalizedCatalog,
        nameQuery,
        country,
        stateValue,
        city,
        category,
        starsFilter,
    ]);
    const sortedFilteredCatalog = useMemo(() => {
        if (!sortByNameAscending) {
            return filteredCatalog;
        }

        return [...filteredCatalog].sort((a, b) => {
            const aName = String(a.name || "").trim();
            const bName = String(b.name || "").trim();
            return aName.localeCompare(bName, undefined, { sensitivity: "base" });
        });
    }, [filteredCatalog, sortByNameAscending]);

    const filteredIds = useMemo(
        () => sortedFilteredCatalog.map((restaurant) => restaurant.id),
        [sortedFilteredCatalog]
    );
    const totalPages = Math.max(1, Math.ceil(filteredIds.length / pageSize));

    const pageIds = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return filteredIds.slice(startIndex, startIndex + pageSize);
    }, [currentPage, filteredIds, pageSize]);

    const pagedRestaurants = useMemo(
        () =>
            pageIds
                .map((id) => detailsById[id] ?? catalogById[id])
                .filter(Boolean) as Restaurant[],
        [catalogById, detailsById, pageIds]
    );
    useEffect(() => {
        const token = getAuthSessionToken();
        if (!token) {
            router.replace("/authview");
            return;
        }

        const profile = getAuthSessionProfile();
        const userKey = profile.email?.trim().toLowerCase() || "anonymous";
        const storageKey = `${newcomerAlertStoragePrefix}:${userKey}`;
        const hasSeenNewcomerAlert = getLS(storageKey) === "1";

        if (hasSeenNewcomerAlert) {
            return;
        }

        setLS(storageKey, "1");

        void VSModalPaged({
            title: "Alert: how do I use Dine Explorer?",
            messages: [
                "Click on an image to see restaurant details. Use the filters to enhance your experience.",
            ],
            tone: "success",
            confirmText: "Ok",
        });
    }, [router]);


    useEffect(() => {
        if (!firebaseApp) return undefined;
        const auth = getAuth(firebaseApp);
        const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
            setUser(adaptUser(nextUser));
        });
        return () => unsubscribe();
    }, [firebaseApp]);

    useEffect(() => {
        setAuthProfile(getAuthSessionProfile());
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const handleStorage = (event: StorageEvent) => {
            if (event.key !== "restaurantcards_auth_profile") return;
            setAuthProfile(getAuthSessionProfile());
        };
        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, []);



    const handleSignOut = async () => {
        if (!firebaseApp) {
            setAuthError("Firebase auth is not configured.");
            return;
        }

        try {
            clearAuthSessionProfile();
            clearAuthSessionToken();
            setAuthError("");
        } catch (signOutError) {
            console.error("[RestaurantCardsPage] sign out failed:", signOutError);
            setAuthError("Failed to sign out.");
        }
    };

    // ===========================
    // B) Load restaurants
    // ===========================
    useEffect(() => {
        let isMounted = true;

        async function loadRestaurants() {
            try {
                setLoading(true);
                setError("");

                const items = await fetchRestaurantsCatalog();
                if (!isMounted) return;
                setCatalog(items);
            } catch (err) {
                console.error("[RestaurantCardsPage] load failed:", err);
                if (isMounted) setError("Failed to load restaurants.");
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        loadRestaurants();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage((prev) => prev + 1);
        }
    };

    const loadDetailsByIds = async (missingIds: string[]) => {
        try {
            setLoadingMore(true);

            const items = await fetchRestaurantsByIds(missingIds);

            if (items.length) {
                setDetailsById((y) => {
                    const next = { ...y};
                    items.forEach((r) => (next[r.id] = r));
                    return next;
                });
            }

            if (items.length !== missingIds.length) {
                const foundIds = new Set(items.map((r) => r.id));
                const missing = missingIds.filter((id) => !foundIds.has(id));
                if (missing.length) {
                    setMissingDetailIds((prev) => {
                        const next = new Set(prev);
                        missing.forEach((id) => next.add(id));
                        return next;
                    });
                }
            }
        } catch (err) {
            console.error("[RestaurantCardsPage] details load failed:", err);
            setError("Failed to load restaurant details.");
        } finally {
            setLoadingMore(false);
        }
    };
    const handleLoadMoreClick = async () => {
        const missingIds = pageIds.filter(
            (id) => !detailsById[id] && !missingDetailIds.has(id)
        );
        if (!missingIds.length) return;
        await loadDetailsByIds(missingIds);
    };
    const handleLoadMore = async (missingIds: string[]) => {
        try {
            setLoadingMore(true);
            const items = await fetchRestaurantsByIds(missingIds);
            if (items.length) {
                setDetailsById((prev) => {
                    const next = { ...prev };
                    items.forEach((restaurant) => {
                        next[restaurant.id] = restaurant;
                    });
                    return next;
                });
            }
            if (items.length !== missingIds.length) {
                const foundIds = new Set(items.map((restaurant) => restaurant.id));
                const missing = missingIds.filter((id) => !foundIds.has(id));
                if (missing.length) {
                    setMissingDetailIds((prev) => {
                        const next = new Set(prev);
                        missing.forEach((id) => next.add(id));
                        return next;
                    });
                }
            }
        } catch (err) {
            console.error("[RestaurantCardsPage] details load failed:", err);
            setError("Failed to load restaurant details.");
        } finally {
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        if (!pageIds.length) return;

        const missingIds = pageIds.filter(
            (id) => !detailsById[id] && !missingDetailIds.has(id)
        );
        if (!missingIds.length) return;

        let isMounted = true;

        const loadDetails = async () => {
            if (!isMounted) return;
            await handleLoadMore(missingIds);
        };

        loadDetails();
        return () => {
            isMounted = false;
        };
    }, [detailsById, missingDetailIds, pageIds]);

    // ===========================
    // C) Preload imagens (se você tiver URLs)
    // ===========================
    useEffect(() => {
        if (pagedRestaurants.length === 0) {
            setCardImageUrls({});
            return;
        }

        let isMounted = true;

        const preloadImage = (url: string) =>
            new Promise<void>((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve();
                img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
                img.src = url;
            });

        const loadStorageImages = async () => {
            const nextUrls: Record<string, string> = {};
            const preloadUrls: string[] = [];

            pagedRestaurants.forEach((restaurant) => {
                const candidate =
                    restaurant.photo ||
                    restaurant.imagePath ||
                    restaurant.photoPath ||
                    restaurant.storagePath ||
                    "";
                if (!candidate) return;
                nextUrls[restaurant.id] = candidate;
                preloadUrls.push(candidate);
            });

            if (!isMounted) return;
            setCardImageUrls(nextUrls);

            if (preloadUrls.length) {
                await Promise.allSettled(preloadUrls.map((url) => preloadImage(url)));
            }
        };

        loadStorageImages();
        return () => {
            isMounted = false;
        };
    }, [pagedRestaurants]);


    const availableCountries = useMemo(() => {
        const options = new Set<string>();
        normalizedCatalog.forEach((r) => r.country && options.add(r.country));
        return Array.from(options).sort();
    }, [normalizedCatalog]);

    const availableStates = useMemo(() => {
        const options = new Set<string>();
        normalizedCatalog.forEach((r) => {
            if (country && r.country !== country) return;
            if (r.state) options.add(r.state);
        });
        return Array.from(options).sort();
    }, [normalizedCatalog, country]);

    const availableCities = useMemo(() => {
        const options = new Set<string>();
        normalizedCatalog.forEach((r) => {
            if (country && r.country !== country) return;
            if (stateValue && r.state !== stateValue) return;
            if (r.city) options.add(r.city);
        });
        return Array.from(options).sort();
    }, [normalizedCatalog, country, stateValue]);

    const availableCategories = useMemo(() => {
        const seen = new Set<string>();
        const options: string[] = [];

        FOOD_CATEGORIES.forEach((c) => {
            const normalized = normalizeCategoryLabel(c);
            if (!normalized) return;
            const key = normalized.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            options.push(normalized);
        });

        return options.sort((a, b) => a.localeCompare(b));
    }, []);

    useEffect(() => {
        setStateValue("");
        setCity("");
    }, [country]);

    useEffect(() => {
        setCity("");
    }, [stateValue]);


    useEffect(() => {
        setCurrentPage(1);
    }, [nameQuery, country, stateValue, city, category, starsFilter]);


    const authProfileLabel = authProfile.email?.trim();
    const userLabel = authProfileLabel || getUserLabel(user, "Guest");
    const userPhoto = authProfileLabel ? "" : getUserPhotoUrl(user);

    const renderPaginationNavbar = (extraClassName = "") => {
        if (loading || error || filteredIds.length === 0) {
            return null;
        }

        return (
            <div
                className={[
                    "relative flex flex-wrap items-center justify-between gap-4 px-6 py-5",
                    "rounded-3xl",
                    GLOW_BAR,
                    "bg-emerald-500/20",
                    "border border-emerald-400",
                    GLOW_LINE,
                    extraClassName,
                ].join(" ")}
            >
                <div>
                    Showing{" "}
                    <span className="font-semibold text-white">{(currentPage - 1) * pageSize + 1}</span> -{" "}
                    <span className="font-semibold text-white">
                        {Math.min(currentPage * pageSize, filteredIds.length)}
                    </span>{" "}
                    of <span className="font-semibold text-white">{filteredIds.length}</span> restaurants
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="h-10 rounded-xl border border-white/25 bg-white/10 px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Previous
                    </button>

                    <span className="text-xs text-white/70">
                        Page <span className="font-semibold text-white">{currentPage}</span> of{" "}
                        <span className="font-semibold text-white">{totalPages}</span>
                    </span>

                    <button
                        type="button"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        className="h-10 rounded-xl border border-white/25 bg-white/10 px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {loadingMore ? "Loading…" : "Next"}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="relative min-h-screen fe-fragmented-texture text-black" style={pageBackgroundStyle}>
            <div className="pointer-events-none absolute inset-0 opacity-80">
                <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-[#22c55e]/20 blur-[140px]" />
                <div className="absolute left-1/2 top-32 h-80 w-80 -translate-x-1/2 rounded-full bg-[#38bdf8]/25 blur-[160px]" />
                <div className="absolute bottom-12 right-16 h-56 w-56 rounded-full bg-[#f97316]/20 blur-[120px]" />
            </div>

            <div className="mx-auto max-w-8xl py-6 font-sharetech text-white sm:px-6 relative z-10">
                <header
                    className={[
                        "relative flex flex-wrap items-center justify-between gap-4 px-6 py-5",
                        "rounded-3xl",
                        GLOW_BAR,
                        "border border-white/25",
                        GLOW_LINE,
                    ].join(" ")}
                >
                    <div className="pointer-events-none absolute inset-0 opacity-35 bg-gradient-to-b from-white/35 via-white/0 to-black/0" />

                    <div   className={[
                        "rounded-2xl",
                        "px-4 py-3",
                        "w-fit",
                        "bg-white",
                        "text-amber-500",
                        "border-amber-300",
                        "border-4",
                        GLOW_LINE,
                        "shadow-[0_18px_60px_rgba(0,0,0,0.25)]",
                    ].join(" ")}>
                        <div className="flex items-center gap-4">
                            <img
                                src="/1E8AEB0C-78BC-42FD-9113-73F1A0728A3A_1_105_c.jpeg"
                                alt="Velion Infyra Technology Platforms, Inc."
                                className="h-14 w-auto"
                            />
                            <div className="hidden sm:block font-sametech leading-tight">
                                <div className="text-xs font-semibold tracking-[0.22em] text-orange-600 uppercase">
                                    DINE EXPLORER
                                </div>
                                <div className="text-sm font-semibold text-amber-500">

                                </div>
                            </div>

                    </div>


                    </div>

                    <div className="relative z-10 min-w-[220px] text-right">
                        <div className="flex justify-end">
                            {userPhoto ? (
                                <img
                                    src={userPhoto}
                                    alt={`${userLabel} profile`}
                                    className="mb-1.5 h-9 w-9 rounded-full border border-white/60 object-cover"
                                />
                            ) : (
                                <div className="mb-1.5 text-sm text-white/90">Guest</div>
                            )}
                        </div>

                        <div className="font-semibold">{userLabel}</div>

                        {authError ? <div className="mt-1.5 text-xs text-amber-200">{authError}</div> : null}

                        <button
                            type="button"
                            onClick={() => {
                                router.replace("/authview");
                                queueMicrotask(() => handleSignOut());
                            }}
                            className="mt-2 h-11 rounded-2xl border border-white/20 bg-white/10 px-4 text-xs font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/35"
                        >
                            Sign out
                        </button>
                    </div>

                    <section
                        className={[
                            "relative z-10",
                            "w-full max-w-[1280px]",
                            "h-full",
                            "ml-auto",
                            "mt-3",
                            "rounded-3xl px-5 py-4",
                            FILTER_GLOW_BAR,
                            "border border-white/18",
                            FILTER_GLOW_LINE,
                        ].join(" ")}
                    >
                        <div className="grid gap-4 lg:grid-cols-[minmax(240px,350px)_1fr] items-start">
                            <div className="font-sharetech">
                                <input
                                    type="text"
                                    value={nameQuery}
                                    onChange={(event) => setNameQuery(event.target.value)}
                                    placeholder="Search by name"
                                    className={GLASS_INPUT}
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-4">
                                <div className="min-w-[180px] font-sharetech flex-1">
                                    <SearchSelect
                                        value={country}
                                        options={availableCountries}
                                        onChange={setCountry}
                                        placeholder="All countries"
                                        allLabel="All countries"
                                        includeAllOption
                                        searchPlaceholder="Search country…"
                                        getOptionLabel={(opt) => opt}
                                        renderValue={(opt) => {
                                            const flag = getCountryFlagPng(opt);
                                            return (
                                                <span className="inline-flex items-center gap-2">
                          {flag ? (
                              <img src={flag.src} alt={flag.alt} className="h-[18px] w-[18px]" />
                          ) : (
                              <span aria-hidden>🌍</span>
                          )}
                                                    <span>{opt}</span>
                        </span>
                                            );
                                        }}
                                        renderOption={(opt) => {
                                            const flag = getCountryFlagPng(opt);
                                            return (
                                                <span className="inline-flex items-center gap-2">
                          {flag ? (
                              <img
                                  src={flag.src}
                                  alt={flag.alt}
                                  className="h-[18px] w-[18px] rounded-[6px] object-cover"
                              />
                          ) : (
                              <span aria-hidden>🌍</span>
                          )}
                                                    <span>{opt}</span>
                        </span>
                                            );
                                        }}
                                    />
                                </div>

                                <div className="min-w-[200px] font-sharetech flex-1">
                                    <SearchSelect
                                        value={stateValue}
                                        options={availableStates}
                                        onChange={setStateValue}
                                        placeholder="All states"
                                        allLabel="All states"
                                        includeAllOption
                                        searchPlaceholder="Search state…"
                                        getOptionLabel={(opt) => opt}
                                        disabled={!availableStates.length}
                                    />
                                </div>

                                <div className="min-w-[200px] font-sharetech flex-1">
                                    <SearchSelect
                                        value={city}
                                        options={availableCities}
                                        onChange={setCity}
                                        placeholder="All cities"
                                        allLabel="All cities"
                                        includeAllOption
                                        searchPlaceholder="Search city…"
                                        getOptionLabel={(opt) => opt}
                                        disabled={!availableCities.length}
                                    />
                                </div>

                                <div className="min-w-[220px] font-sharetech flex-1">
                                    <SearchSelect
                                        value={category}
                                        options={availableCategories}
                                        onChange={setCategory}
                                        placeholder="All categories"
                                        allLabel="All categories"
                                        includeAllOption
                                        searchPlaceholder="Search category…"
                                        getOptionLabel={(opt) => opt}
                                        renderValue={(opt) => (
                                            <span className="inline-flex items-center gap-2">
                        <span aria-hidden>{getCategoryIcon(opt)}</span>
                        <span>{opt}</span>
                      </span>
                                        )}
                                        renderOption={(opt) => (
                                            <span className="inline-flex items-center gap-2">
                        <span aria-hidden>{getCategoryIcon(opt)}</span>
                        <span>{opt}</span>
                      </span>
                                        )}
                                    />
                                </div>

                                <div className="min-w-[200px] font-sharetech flex-1">
                                    <SearchSelect
                                        value={starsFilter}
                                        options={["1", "2", "3", "4", "5"]}
                                        onChange={setStarsFilter}
                                        placeholder="All star ratings"
                                        allLabel="All star ratings"
                                        includeAllOption
                                        searchPlaceholder="Search stars…"
                                        getOptionLabel={(opt) => `${opt}+ stars`}
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setSortByNameAscending((current) => !current)}
                                    className="h-11 rounded-2xl border border-white/25 bg-white/10 px-4 text-xs font-semibold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/35"
                                >
                                    {sortByNameAscending ? "Name: A→Z (On)" : "Sort by Name A→Z"}
                                </button>
                            </div>
                        </div>
                    </section>
                </header>

                <section className="mt-4 m-3.5 min-w-2xl">
                    {renderPaginationNavbar("mb-5")}

                    {!loading && error ? (
                        <p className="whitespace-pre-wrap rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 backdrop-blur-2xl">
                            {error}
                        </p>
                    ) : null}

                    {!loading && !error && filteredIds.length === 0 ? (
                        <p className="rounded-2xl border border-white/14 bg-white/[0.08] px-4 py-3 text-sm text-white/70 backdrop-blur-2xl">
                            No restaurants match your filters.
                        </p>
                    ) : null}

                    <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-8 justify-items-center">
                        {pagedRestaurants.map((restaurant) => {
                            const ratingValueRaw =
                                restaurant.starsgiven ?? restaurant.rating ?? restaurant.grade ?? 0;

                            const { rounded, display } = getStarRating(ratingValueRaw);
                            const fallbackImage = getFallbackImageForRestaurant(restaurant);

                            const cardImageSrc =
                                restaurant.photo ||
                                restaurant.imagePath ||
                                restaurant.photoPath ||
                                restaurant.storagePath ||
                                cardImageUrls[restaurant.id] ||
                                fallbackImage;

                            return (
                                <Link
                                    key={restaurant.id}
                                    href={`/restaurantinfopage/${restaurant.id}`}
                                    className="text-inherit no-underline"
                                >
                                    <article
                                        className={[
                                            "group relative rounded-3xl",
                                            "border-yellow-200",
                                            "rounded-2xl",
                                            "border-4",
                                            "shadow-[0_0_0_1px_rgba(249,115,22,0.55),0_18px_60px_rgba(249,115,22,0.45)]",

                                            // 🌈 FUNDO IGUAL AO FILTRO
                                            GLOW_BAR,

                                            "transition duration-200",
                                            "min-h-[300px]",
                                            "w-full max-w-[320px]",
                                        ].join(" ")}
                                    >
                                        {/* brilho sutil superior */}
                                        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[linear-gradient(to_bottom,rgba(255,255,255,0.18),rgba(255,255,255,0)_45%)]" />

                                        {cardImageSrc ? (
                                            <div className="relative">
                                                <img
                                                    src={cardImageSrc}
                                                    alt={restaurant.name || "Restaurant"}
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="block h-40 w-full object-cover rounded-t-3xl opacity-95"
                                                />
                                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-black/0" />
                                            </div>
                                        ) : (
                                            <div aria-hidden className="h-40 w-full rounded-t-3xl bg-white/5" />
                                        )}

                                        {/* ⬇️ INNER DIV — BRANCA, TEXTO PRETO, BORDA PRETA */}
                                        <div className="relative p-4">
                                            <div className="rounded-2xl border-4 border-yellow-200 bg-white px-4 py-3 text-center shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                                                <h3 className="text-lg font-semibold leading-tight text-black">
                                                    {restaurant.name || "Unnamed Restaurant"}
                                                </h3>

                                                <span
                                                    aria-label={`Restaurant rating ${display.toFixed(1)} out of 5`}
                                                    className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-black"
                                                >
        <span className="inline-flex gap-0.5 text-base">
          {Array.from({ length: 5 }, (_, index) => (
              <span
                  key={`star-${restaurant.id}-${index}`}
                  className={index < rounded ? "text-amber-400" : "text-black/20"}
              >
              ★
            </span>
          ))}
        </span>
        <span className="text-xs text-black/70">
          {display.toFixed(1)}
        </span>
      </span>

                                                <div className="my-3 h-px w-full bg-black/15" />

                                                <p className="text-sm text-black">
                                                    {[restaurant.address, restaurant.street, restaurant.city, restaurant.state]
                                                        .filter(Boolean)
                                                        .join(", ") || "Address unavailable."}
                                                </p>

                                                <div className="mt-2 text-xs text-black/70">
                                                    <div>
                                                        {restaurant.city || "Unknown city"}
                                                        {restaurant.state ? `, ${restaurant.state}` : ""}
                                                    </div>

                                                    <div className="mt-1 inline-flex items-center gap-2">
                                                        {restaurant.country ? (
                                                            (() => {
                                                                const flag = getCountryFlagPng(restaurant.country);
                                                                return (
                                                                    <>
                                                                        {flag ? (
                                                                            <img
                                                                                src={flag.src}
                                                                                alt={flag.alt}
                                                                                className="h-[18px] w-[18px]"
                                                                            />
                                                                        ) : (
                                                                            <span aria-hidden>🌍</span>
                                                                        )}
                                                                        <span>{restaurant.country}</span>
                                                                    </>
                                                                );
                                                            })()
                                                        ) : (
                                                            <>
                                                                <span aria-hidden>🌍</span>
                                                                <span>Unknown country</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </article>

                                </Link>
                            );
                        })}
                    </div>

                    {renderPaginationNavbar()}

                    {nextCursor ? (
                        <div className="mt-5 flex justify-center">
                            <button
                                type="button"
                                onClick={handleLoadMoreClick}
                                disabled={loadingMore}
                                className="h-11 rounded-2xl border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {loadingMore ? "Loading more…" : "Load more restaurants"}
                            </button>
                        </div>
                    ) : null}
                </section>
            </div>
        </div>
    );
}
