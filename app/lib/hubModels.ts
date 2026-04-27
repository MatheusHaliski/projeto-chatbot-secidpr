export type StaffRole = "manager" | "attendant" | "worker";
export type GlobalRole = "platform_admin" | "restaurant_user" | "customer";

export type ConversationIntent =
    | "reservation"
    | "order_help"
    | "complaint"
    | "delivery"
    | "feedback"
    | "general";

export type ConversationStatus = "new" | "assigned" | "pending" | "resolved";

export type MemberRecord = {
    uid: string;
    role: StaffRole;
    active: boolean;
    permissions: string[];
    displayName?: string;
    email?: string;
    joinedAt: number;
};

export type CustomerRecord = {
    uid: string;
    displayName?: string;
    email?: string;
    phone?: string;
    loyaltyTier?: "Bronze" | "Silver" | "Gold";
    totalOrders: number;
    totalSpend: number;
    tags: string[];
    lastVisitAt?: number;
};

export type SocialPostRecord = {
    id?: string;
    restaurantId: string;
    authorUid: string;
    type: "text" | "image" | "video" | "poll";
    category: "promo" | "event" | "announcement" | "ugc-feature";
    body: string;
    mediaUrl?: string;
    pollOptions?: string[];
    shoppableCta?: {
        label: string;
        productIds: string[];
        href?: string;
    };
    createdAt: number;
    updatedAt: number;
};

export type ConversationRecord = {
    id?: string;
    restaurantId: string;
    clientUid: string;
    intent: ConversationIntent;
    status: ConversationStatus;
    priority: "low" | "normal" | "high";
    assignedToUid: string | null;
    channel: "in_app" | "instagram" | "whatsapp" | "facebook";
    lastMessage: string;
    createdAt: number;
    updatedAt: number;
    dueAt: number;
};
