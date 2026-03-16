export function getLS(key: string): string | null {
    if (typeof window === "undefined") return null;
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

export function setLS(key: string, value: string): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(key, value);
    } catch {}
}

export function removeLS(key: string): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.removeItem(key);
    } catch {}
}
