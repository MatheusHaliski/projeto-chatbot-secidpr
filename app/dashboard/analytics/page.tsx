import { getAdminFirestore } from "@/app/lib/firebaseAdmin";

type AnalyticsPageProps = {
    searchParams?: Promise<{ restaurantId?: string }>;
};

export default async function DashboardAnalyticsPage({ searchParams }: AnalyticsPageProps) {
    const resolvedSearchParams = (await searchParams) ?? {};
    const restaurantId = resolvedSearchParams.restaurantId ?? "default";

    const db = getAdminFirestore();
    const [postsSnap, conversationsSnap, ordersSnap] = await Promise.all([
        db.collection("restaurants").doc(restaurantId).collection("posts").get(),
        db.collection("restaurants").doc(restaurantId).collection("conversations").get(),
        db.collection("restaurants").doc(restaurantId).collection("orders").get(),
    ]);

    const metrics = [
        { label: "Posts", value: postsSnap.size },
        { label: "Conversations", value: conversationsSnap.size },
        { label: "Orders", value: ordersSnap.size },
    ];

    return (
        <main className="min-h-screen bg-black text-white p-6 space-y-5">
            <h1 className="text-2xl font-semibold">Analytics</h1>
            <p className="text-sm text-zinc-300">Engagement → Orders → Retention ({restaurantId})</p>
            <div className="grid md:grid-cols-3 gap-3">
                {metrics.map((metric) => (
                    <article key={metric.label} className="border border-zinc-800 rounded p-4">
                        <p className="text-zinc-300 text-sm">{metric.label}</p>
                        <p className="text-2xl font-semibold">{metric.value}</p>
                    </article>
                ))}
            </div>
        </main>
    );
}
