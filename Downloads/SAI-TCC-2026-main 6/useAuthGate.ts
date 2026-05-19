"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
} from "firebase/firestore/lite";

import { firebaseAuthGate } from "@/app/gate/firebaseClient";
import { signInWithGoogle, signOutUser } from "@/app/auth";
import { getDb } from "@/app/gate/getDb";
import {
    adaptUser,
    type AuthUser,
    getUserDisplayName,
    getUserEmail,
    getUserId,
} from "@/app/authview/AuthAdapter";
import {
    clearDevSessionToken,
    getDevSessionToken,
    setDevSessionToken,
} from "@/app/lib/devSession";
const { hasFirebaseConfig } = firebaseAuthGate();
const db =  getDb();
export const useAuthGate = () => {
    const [user] = useState<AuthUser | null>(null);
    const [authReady, setAuthReady] = useState(false);
    const [authError, setAuthError] = useState("");
    const [pinInput, setPinInput] = useState("");
    const [pinError, setPinError] = useState("");
    const [pinVerified, setPinVerified] = useState(false);
    const [pinChecking, setPinChecking] = useState(false);
    const [pinAttempts, setPinAttempts] = useState(0);
    const [isBlocked, setIsBlocked] = useState(false);
    const [checkingBlocked, setCheckingBlocked] = useState(false);
    const [sessionToken, setSessionToken] = useState(() => getDevSessionToken());

    const [pinCheckReady, setPinCheckReady] = useState(false);
    const [remoteSessionExpired, setRemoteSessionExpired] = useState(false);
    const [rootSignOutInProgress, setRootSignOutInProgress] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    const hasAccess = Boolean(user && pinVerified && sessionToken);
    const ALLOWED_GOOGLE_EMAIL = "matheushaliski@gmail.com";
    const SESSION_TOKEN_KEY = "restaurantcards_session_token";


    const encodeBase64Url = (bytes: Uint8Array) =>
        btoa(String.fromCharCode(...bytes))
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/g, "");

    const createSessionToken = () => {
        const bytes = new Uint8Array(32);
        const token = crypto.randomUUID();
        setDevSessionToken(token);
        setSessionToken(token);

        return encodeBase64Url(bytes);
    };

    const storeSessionToken = (token: string) => {
        setSessionToken(token);
        setDevSessionToken(token);
    };

    const clearSessionToken = () => {
        setSessionToken("");
        clearDevSessionToken();
    };

    useEffect(() => {
        if (typeof window === "undefined") return;
        const handleStorage = (event: StorageEvent) => {
            if (event.key !== SESSION_TOKEN_KEY) return;
            const nextToken = event.newValue ?? "";
            setSessionToken(nextToken);
            if (!nextToken) {
                setRemoteSessionExpired(true);
            }
        };
        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, []);


    const resetPinState = () => {
        setPinVerified(false);
        setPinInput("");
        setPinError("");
        setPinAttempts(0);
    };

    const expireSession = async () => {
        try {
            await fetch("/api/pin", { method: "DELETE" });
        } catch (error) {
            console.error("[AuthGate] Unable to clear PIN during sign out:", error);
        }
        clearSessionToken();
        await signOutUser();
        resetPinState();
    };


    useEffect(() => {
        if (!user) return;


        if (!sessionToken) {
            const token = createSessionToken();
            storeSessionToken(token);
            console.info("[AuthGate] Session token generated:", token);
        }
    }, [user, sessionToken]);

    useEffect(() => {
        if (!user || !db || !hasFirebaseConfig) return;

        let isMounted = true;
        const checkBlockedAndLog = async () => {
            setCheckingBlocked(true);
            try {
                const userId = getUserId(user);
                if (!userId) return;
                const blockedRef = doc(db, "blockedUsers", userId);
                const blockedSnap = await getDoc(blockedRef);
                if (!isMounted) return;

                if (blockedSnap.exists()) {
                    setIsBlocked(true);
                    void Swal.fire({
                        icon: "error",
                        title: "Account blocked",
                        text: "Your account has been blocked. Please contact support.",
                    });
                    await fetch("/api/pin", { method: "DELETE" });
                    clearSessionToken();
                    await signOutUser();
                    return;
                }

                setIsBlocked(false);
                await addDoc(collection(db, "userLogins"), {
                    uid: userId,
                    displayName: getUserDisplayName(user),
                    email: getUserEmail(user),
                    createdAt: serverTimestamp(),
                });
            } catch (error) {
                console.error("[AuthGate] Blocked check failed:", error);
            } finally {
                if (isMounted) setCheckingBlocked(false);
            }
        };

        checkBlockedAndLog();
        return () => {
            isMounted = false;
        };
    }, [user]);

    useEffect(() => {
        if (!user || isBlocked) {
            setPinCheckReady(true);
            return;
        }

        let isMounted = true;
        const checkPinCookie = async () => {
            setPinCheckReady(false);
            try {
                const response = await fetch("/api/pin", {
                    method: "GET",
                });
                if (!response.ok) return;
                if (isMounted) {
                    setPinVerified(true);
                    setPinError("");
                }
            } catch (error) {
                console.error("[AuthGate] Unable to verify PIN cookie:", error);
            } finally {
                if (isMounted) setPinCheckReady(true);
            }
        };

        checkPinCookie();
        return () => {
            isMounted = false;
        };
    }, [user, isBlocked]);

    const handleSignIn = async () => {
        setAuthError("");
        setPinError("");
        setPinVerified(false);
        try {
            const credential = await signInWithGoogle();
            const authUser = adaptUser(credential?.user);
            const normalizedEmail = getUserEmail(authUser).toLowerCase();
            if (normalizedEmail !== ALLOWED_GOOGLE_EMAIL) {
                await signOutUser();
                setAuthError(`Only ${ALLOWED_GOOGLE_EMAIL} is allowed to sign in.`);
                clearSessionToken();
                resetPinState();
                return;
            }
            const token = createSessionToken();
            storeSessionToken(token);
            console.info("[AuthGate] Session token generated:", token);
            void Swal.fire({
                icon: "success",
                title: "Success!",
                text: "Insert PIN",
                timer: 2000,
                showConfirmButton: false,
            });
        } catch (err: any) {
            console.error("[AuthGate] signInWithGoogle failed:", err);
            setAuthError(
                err?.code === "auth/unauthorized-domain"
                    ? "Unauthorized domain for Google Sign-In. Add your domain in Firebase Auth > Settings > Authorized domains."
                    : "Unable to sign in with Google."
            );
        }
    };

    const handleSignOut = async () => {
        setAuthError("");
        try {
            await expireSession();
        } catch (err) {
            console.error("[AuthGate] signOutUser failed:", err);
            setAuthError("Unable to sign out right now.");
        }
    };

    const blockUser = async (reason: string) => {
        if (!user || !db || !hasFirebaseConfig) return;
        try {
            const userId = getUserId(user);
            if (!userId) return;
            await setDoc(doc(db, "blockedUsers", userId), {
                uid: userId,
                displayName: getUserDisplayName(user),
                email: getUserEmail(user),
                blockedAt: serverTimestamp(),
                reason,
            });
            setIsBlocked(true);
            void Swal.fire({
                icon: "error",
                title: "Account blocked",
                text: "Your account has been blocked. Please contact support.",
            });
            await fetch("/api/pin", { method: "DELETE" });
            clearSessionToken();
            await signOutUser();
        } catch (error) {
            console.error("[AuthGate] Failed to block user:", error);
            setPinError("Unable to block account right now.");
        }
    };

    const handlePinVerify = async () => {
        if (isBlocked || checkingBlocked) {
            setPinError("This account is blocked.");
            return;
        }

        const normalizedInput = pinInput.trim();
        if (!normalizedInput) {
            setPinError("Enter the required PIN to continue.");
            setPinVerified(false);
            return;
        }

        setPinChecking(true);
        try {
            const response = await fetch("/api/pin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin: normalizedInput }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                const message =
                    typeof payload?.error === "string"
                        ? payload.error
                        : "Incorrect PIN. Please try again.";
                setPinError(message);
                setPinVerified(false);
                if (response.status === 401) {
                    const nextAttempts = pinAttempts + 1;
                    setPinAttempts(nextAttempts);
                    if (nextAttempts >= 3) {
                        await blockUser("PIN entered incorrectly 3 times.");
                    }
                }
                return;
            }

            setPinError("");
            setPinVerified(true);
            setPinAttempts(0);
        } catch (error) {
            console.error("[AuthGate] PIN verification failed:", error);
            setPinError("Unable to verify PIN right now.");
            setPinVerified(false);
        } finally {
            setPinChecking(false);
        }
    };

    return {
        user,
        authReady,
        authError,
        pinInput,
        setPinInput,
        pinError,
        pinVerified,
        pinChecking,
        pinAttempts,
        isBlocked,
        checkingBlocked,
        sessionToken,
        pinCheckReady,
        hasAccess,
        handleSignIn,
        handleSignOut,
        handlePinVerify,
    };
};
