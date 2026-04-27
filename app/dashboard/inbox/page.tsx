import { getAdminFirestore } from "@/app/lib/firebaseAdmin";

type InboxPageProps = {
    searchParams?: Promise<{ restaurantId?: string }>;
};

export default async function DashboardInboxPage({ searchParams }: InboxPageProps) {
    const resolvedSearchParams = (await searchParams) ?? {};
    const restaurantId = resolvedSearchParams.restaurantId ?? "default";

    let conversations: Array<Record<string, unknown>> = [];
    let errorMessage: string | null = null;

    try {
        const snapshot = await getAdminFirestore()
            .collection("restaurants")
            .doc(restaurantId)
            .collection("conversations")
            .orderBy("updatedAt", "desc")
            .limit(100)
            .get();

        conversations = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("[Dashboard Inbox] unable to read conversations", error);
        errorMessage = "Inbox is unavailable. Check Firestore credentials and indexes.";
    }

    return (
        <main className="min-h-screen bg-black text-white p-6 space-y-6">
            <header>
                <h1 className="text-2xl font-semibold">Inbox</h1>
                <p className="text-sm text-zinc-300">Restaurant: {restaurantId}</p>
            </header>

            {errorMessage ? (
                <p className="text-red-300">{errorMessage}</p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-zinc-800">
                    <table className="min-w-full text-sm">
                        <thead className="bg-zinc-900 text-zinc-300">
                            <tr>
                                <th className="text-left p-3">Client</th>
                                <th className="text-left p-3">Intent</th>
                                <th className="text-left p-3">Status</th>
                                <th className="text-left p-3">Assigned</th>
                                <th className="text-left p-3">SLA Due At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {conversations.map((conversation) => (
                                <tr key={String(conversation.id)} className="border-t border-zinc-800">
                                    <td className="p-3">{String(conversation.clientUid ?? "-")}</td>
                                    <td className="p-3">{String(conversation.intent ?? "general")}</td>
                                    <td className="p-3">{String(conversation.status ?? "new")}</td>
                                    <td className="p-3">{String(conversation.assignedToUid ?? "Unassigned")}</td>
                                    <td className="p-3">{String(conversation.dueAt ?? "-")}</td>
                                </tr>
                            ))}
                            {!conversations.length && (
                                <tr>
                                    <td className="p-4 text-zinc-400" colSpan={5}>
                                        No conversations yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    );
}
