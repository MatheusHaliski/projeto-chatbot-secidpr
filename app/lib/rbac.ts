import type { StaffRole } from "@/app/lib/hubModels";

export const rolePermissions: Record<StaffRole, string[]> = {
    manager: [
        "conversations.assign",
        "conversations.resolve",
        "members.manage",
        "posts.publish",
        "shopify.sync",
    ],
    attendant: ["conversations.reply", "conversations.assign", "posts.publish"],
    worker: ["operations.read", "conversations.read"],
};

export const hasPermission = (role: StaffRole, permission: string): boolean =>
    rolePermissions[role]?.includes(permission) ?? false;
