import { getAdminFirestore } from "@/app/lib/firebaseAdmin";

type PeoplePageProps = {
    searchParams?: Promise<{ restaurantId?: string; role?: string }>;
};

export default async function DashboardPeoplePage({ searchParams }: PeoplePageProps) {
    const resolvedSearchParams = (await searchParams) ?? {};
    const restaurantId = resolvedSearchParams.restaurantId ?? "default";
    const roleFilter = resolvedSearchParams.role ?? "all";

    const db = getAdminFirestore();

    const [membersSnapshot, customersSnapshot] = await Promise.all([
        db.collection("restaurants").doc(restaurantId).collection("members").get(),
        db.collection("restaurants").doc(restaurantId).collection("customers").get(),
    ]);

    const members = membersSnapshot.docs
        .map((doc) => ({ uid: doc.id, ...doc.data() }))
        .filter((member) => roleFilter === "all" || member.role === roleFilter);

    const customers = customersSnapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));

    return (
        <main className="min-h-screen bg-black text-white p-6 space-y-8">
            <header>
                <h1 className="text-2xl font-semibold">People Directory</h1>
                <p className="text-sm text-zinc-300">Restaurant: {restaurantId}</p>
            </header>

            <section className="space-y-3">
                <h2 className="text-lg font-medium">Staff ({members.length})</h2>
                <div className="grid md:grid-cols-2 gap-3">
                    {members.map((member) => (
                        <article key={String(member.uid)} className="rounded border border-zinc-800 p-3">
                            <p className="font-medium">{String(member.displayName ?? member.uid)}</p>
                            <p className="text-xs text-zinc-300">Role: {String(member.role ?? "worker")}</p>
                            <p className="text-xs text-zinc-300">Active: {String(member.active ?? true)}</p>
                        </article>
                    ))}
                    {!members.length && <p className="text-zinc-400">No staff found for this filter.</p>}
                </div>
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-medium">Customers ({customers.length})</h2>
                <div className="grid md:grid-cols-2 gap-3">
                    {customers.map((customer) => (
                        <article key={String(customer.uid)} className="rounded border border-zinc-800 p-3">
                            <p className="font-medium">{String(customer.displayName ?? customer.uid)}</p>
                            <p className="text-xs text-zinc-300">
                                Tier: {String(customer.loyaltyTier ?? "Bronze")}
                            </p>
                            <p className="text-xs text-zinc-300">
                                Spend: {String(customer.totalSpend ?? 0)}
                            </p>
                        </article>
                    ))}
                    {!customers.length && <p className="text-zinc-400">No customers found yet.</p>}
                </div>
            </section>
        </main>
    );
}
