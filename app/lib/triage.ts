import type { ConversationIntent } from "@/app/lib/hubModels";

const INTENT_KEYWORDS: Record<ConversationIntent, string[]> = {
    reservation: ["reserve", "reservation", "table", "book"],
    order_help: ["order", "checkout", "payment", "menu"],
    complaint: ["complaint", "bad", "late", "wrong", "issue"],
    delivery: ["delivery", "driver", "courier", "arrival"],
    feedback: ["feedback", "suggestion", "love", "great"],
    general: [],
};

export const inferIntent = (message: string): ConversationIntent => {
    const normalized = message.toLowerCase();

    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [ConversationIntent, string[]][]) {
        if (keywords.some((keyword) => normalized.includes(keyword))) {
            return intent;
        }
    }

    return "general";
};

export const getSlaDueAt = (intent: ConversationIntent, createdAt: number): number => {
    const minutesByIntent: Record<ConversationIntent, number> = {
        complaint: 10,
        order_help: 15,
        reservation: 20,
        delivery: 20,
        feedback: 60,
        general: 30,
    };

    return createdAt + minutesByIntent[intent] * 60 * 1000;
};
