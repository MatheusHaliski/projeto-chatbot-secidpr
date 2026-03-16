import { getAdminFirestore } from "@/app/lib/firebaseAdmin";
import RestaurantInfoFront from "@/app/restaurantinfopage/[id]/RestaurantInfoFront";
import {useSessionReady} from "@/app/lib/useSessionReady";

type RestaurantRecord = Record<string, unknown> & { id: string };

type ReviewRecord = Record<string, unknown> & { id: string };
const toPlainObject = <T,>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

export default async function Page({
  params,
}: {
  params: Promise<{ id?: string }> | { id?: string };
}) {

  const resolvedParams = await params;
  const id = Array.isArray(resolvedParams?.id)
    ? resolvedParams?.id[0]
    : resolvedParams?.id;

  if (!id) {
    return <div className="text-white p-6">Restaurant not found.</div>;
  }

  try {
    const db = getAdminFirestore();
    const restaurantSnap = await db.collection("restaurants").doc(id).get();
    const reviewSnap = await db
      .collection("review")
      .where("restaurantId", "==", id)
      .get();

    if (!restaurantSnap.exists) {
      return <div className="text-white p-6">Restaurant not found.</div>;
    }

    const restaurant = toPlainObject({
      id: restaurantSnap.id,
      ...restaurantSnap.data(),
    }) as RestaurantRecord;

    const reviews = reviewSnap.docs.map((docItem) =>
      toPlainObject({
        id: docItem.id,
        ...docItem.data(),
      })
    ) as ReviewRecord[];

    return <RestaurantInfoFront restaurant={restaurant} reviews={reviews} />;
  } catch (err) {
    console.error("[RestaurantInfoPage] load failed:", err);
    return (
      <div className="text-white p-6">
        Unable to load restaurant details.
      </div>
    );
  }
}
