"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { firebaseAuthGate } from "./firebaseClient";

import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithCredential,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type Firestore,
} from "firebase/firestore/lite";

import { DEV_SESSION_TOKEN_KEY } from "@/app/lib/devSession";
import { getDb } from "@/app/gate/getDb";

// ============================
// Google Identity types
// ============================
type GoogleCredentialResponse = {
  credential?: string;
  select_by?: string;
};

type GoogleIdInitializeConfig = {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: GoogleIdInitializeConfig) => void;
          renderButton: (
            parent: HTMLElement | null,
            options: Record<string, unknown>
          ) => void;
        };
      };
    };
  }
}

type UseAuthGateReturn = {
  googleAuthed: boolean;
  googleUserId: string;
  googleError: string;

  pinInput: string;
  setPinInput: React.Dispatch<React.SetStateAction<string>>;
  pinVerified: boolean;
  pinError: string;
  pinAttempts: number;
  pinLocked: boolean;

  DEV_SESSION_TOKEN_CONTROL_KEY: string;
  TOKEN_KEY: string;

  verifyPin: () => Promise<void>;
  resetGate: () => void;
};

export function useAuthGate(): UseAuthGateReturn {
  // ============================
  // constants
  // ============================
  const TOKEN_KEY = DEV_SESSION_TOKEN_KEY;
  const DEV_SESSION_TOKEN_CONTROL_KEY = "false";
  const router = useRouter();

  const MAX_PIN_ATTEMPTS = 3;
  const ALLOWED_GOOGLE_EMAIL = "matheushaliski@gmail.com";

  const { firebaseApp, hasFirebaseConfig } = firebaseAuthGate();
  const db = getDb() as Firestore | null;

  // ============================
  // state
  // ============================
  const [googleAuthed, setGoogleAuthed] = useState(false);
  const [googleUserId, setGoogleUserId] = useState("");
  const [googleError, setGoogleError] = useState("");

  const [pinInput, setPinInput] = useState("");
  const [pinVerified, setPinVerified] = useState(false);
  const [pinError, setPinError] = useState("");
  const [pinAttempts, setPinAttempts] = useState(0);
  const pinLocked = pinAttempts >= MAX_PIN_ATTEMPTS;

  const [isBlocked, setIsBlocked] = useState(false);

  // ============================
  // auth instance (stable)
  // ============================
  const auth: Auth | null = useMemo(() => {
    if (typeof window === "undefined") return null;
    if (!firebaseApp) return null;
    return getAuth(firebaseApp);
  }, [firebaseApp]);

  // set persistence only once per auth instance
  useEffect(() => {
    if (!auth) return;
    setPersistence(auth, browserLocalPersistence).catch(() => {});
  }, [auth]);

  // helper: wait for a stable auth state (returns user or null)
  const waitForUser = useCallback(async (): Promise<User | null> => {
    if (!auth) return null;
    if (auth.currentUser) return auth.currentUser;

    return await new Promise<User | null>((resolve) => {
      const unsub = onAuthStateChanged(auth, (u) => {
        unsub();
        resolve(u);
      });
    });
  }, [auth]);

  const safeSignOut = useCallback(async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (e: any) {
      console.error("[AuthGate] signOut failed:", e?.code, e?.message);
    }
  }, [auth]);

  const resetGate = useCallback(() => {
    setGoogleAuthed(false);
    setGoogleUserId("");
    setGoogleError("");
    setPinVerified(false);
    setPinInput("");
    setPinError("");
    setPinAttempts(0);
    setIsBlocked(false);
  }, []);

  // ============================
  // helpers
  // ============================
  function parseGoogleCredential(credential: string): string {
    if (!credential) return "";
    try {
      const payload = credential.split(".")[1];
      if (!payload) return "";
      let normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
      normalized = normalized.padEnd(
        normalized.length + ((4 - (normalized.length % 4)) % 4),
        "="
      );
      const json = atob(normalized);
      const data = JSON.parse(json) as { email?: string; sub?: string };
      return data?.email || data?.sub || "";
    } catch {
      return "";
    }
  }

  // ============================
  // blocked checks (safe)
  // ============================
  const checkBlockedUser = useCallback(
    async (uid: string, email: string | null): Promise<boolean> => {
      if (!db || !hasFirebaseConfig) return false;

      try {
        // check by UID
        if (uid){
        const uidRef = doc(db, "blousers", uid);
        const uidSnap = await getDoc(uidRef);
        if (uidSnap.exists()) return true;
        }
        // check by email (normalized)
        else if (email) {
          const normalizedEmail = email.toLowerCase();
          const emailRef = doc(db, "blousers", normalizedEmail);
          const emailSnap = await getDoc(emailRef);
          if (emailSnap.exists()) return true;
        }

        return false;
      } catch (e: any) {
        // IMPORTANT: do not break auth flow due to rules/network.
        console.warn("[AuthGate] blocked check failed:", e?.code || e?.message);
        return false;
      }
    },
    [db, hasFirebaseConfig]
  );

  const blockUser = useCallback(
    async (uid: string, email: string | null, reason: string) => {
      if (!db || !hasFirebaseConfig) return;

      const normalizedEmail = email?.toLowerCase() ?? null;

      try {
        await setDoc(doc(db, "blousers", uid), {
          uid,
          email: normalizedEmail,
          blockedAt: serverTimestamp(),
          reason,
        });
      } catch (e: any) {
        console.error("[AuthGate] failed to write block record:", e?.code, e?.message);
      }

      setIsBlocked(true);
      setGoogleAuthed(false);
      setGoogleUserId("");
      setPinError("Account blocked. Please contact support.");
      setGoogleError("Account blocked. Please contact support.");

      await safeSignOut();
      router.replace("/");
    },
    [db, hasFirebaseConfig, router, safeSignOut]
  );

  // ============================
  // Google sign-in flow (GIS -> Firebase)
  // ============================
  const signInWithGoogleIdToken = useCallback(
    async (idToken: string) => {
      if (!auth) throw new Error("Firebase auth is not configured.");
      const cred = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, cred);
    },
    [auth]
  );

  const handleGoogleResponse = useCallback(
    async (response: GoogleCredentialResponse) => {
      try {
        setGoogleError("");

        const idToken = response?.credential;
        if (!idToken) {
          setGoogleError("Missing Google credential.");
          return;
        }

        const userId = parseGoogleCredential(idToken);
        const normalizedEmail = userId.toLowerCase();

        if (!normalizedEmail) {
          setGoogleError("Unable to read Google account email.");
          setGoogleAuthed(false);
          setGoogleUserId("");
          return;
        }

        if (normalizedEmail !== ALLOWED_GOOGLE_EMAIL) {
          setGoogleError("Not allowed.");
          setGoogleAuthed(false);
          setGoogleUserId("");
          return;
        }

        // 1) Firebase sign-in first
        await signInWithGoogleIdToken(idToken);

        // 2) Wait for user materialize
        const currentUser = await waitForUser();
        if (!currentUser) {
          setGoogleError("Unable to verify signed-in account.");
          setGoogleAuthed(false);
          setGoogleUserId("");
          await safeSignOut();
          return;
        }

        // 3) Check blocked after auth exists
        const blocked = await checkBlockedUser(currentUser.uid, currentUser.email);
        if (blocked) {
          setIsBlocked(true);
          setGoogleAuthed(false);
          setGoogleUserId("");
          setGoogleError("Account blocked. Please contact support.");
          await safeSignOut();
          return;
        }

        setIsBlocked(false);
        setGoogleAuthed(true);
        setGoogleUserId(currentUser.email || currentUser.uid);
        setGoogleError("");
      } catch (e: any) {
        console.error("[AuthGate] Firebase sign-in failed:", e?.code, e?.message);
        setGoogleError("Failed to sign in to Firebase.");
        setGoogleAuthed(false);
        setGoogleUserId("");
      }
    },
    [
      ALLOWED_GOOGLE_EMAIL,
      checkBlockedUser,
      safeSignOut,
      signInWithGoogleIdToken,
      waitForUser,
    ]
  );

  // load Google SDK + render button
  const clientId =
    "457209482063-s3q59rtck2dg6mcruuq2qbea1ee7ofe8.apps.googleusercontent.com";

  useEffect(() => {
    if (!clientId) {
      setGoogleError("Missing Google client_id.");
      return;
    }

    const render = () => {
      if (!window.google?.accounts?.id) {
        setGoogleError("Google Identity Services failed to load.");
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleResponse,
      });

      window.google.accounts.id.renderButton(
        document.getElementById("google-signin"),
        { theme: "outline", size: "large", text: "continue_with" }
      );
    };

    if (window.google?.accounts?.id) {
      render();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = render;
    script.onerror = () => setGoogleError("Google Identity Services failed to load.");
    document.body.appendChild(script);

    return () => {
      // avoid removing script if it was not added
      try {
        document.body.removeChild(script);
      } catch {}
    };
  }, [clientId, handleGoogleResponse]);



  const buildFirebaseAuthHeader = useCallback(async (): Promise<Record<string, string> | null> => {
    const currentUser = await waitForUser();
    if (!currentUser) return null;

    const token = await currentUser.getIdToken();
    if (!token) return null;

    return { Authorization: `Bearer ${token}` };
  }, [waitForUser]);

  // ============================
  // PIN verify
  // ============================
  const verifyPin = useCallback(async () => {
    setPinError("");

    if (isBlocked) {
      setPinError("Account blocked. Please contact support.");
      return;
    }

    if (pinLocked) {
      setPinError("Too many incorrect PIN attempts. Please contact support.");
      return;
    }

    const normalized = pinInput.trim();
    if (!normalized) {
      setPinError("Enter the PIN to continue.");
      return;
    }

    try {
      const authHeader = await buildFirebaseAuthHeader();
      if (!authHeader) {
        setPinVerified(false);
        setPinError("Unable to verify signed-in account.");
        return;
      }

      const res = await fetch("/api/pin", {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ pin: normalized }),
      });

      const data: unknown = await res.json().catch(() => ({}));
      const msg =
        typeof (data as { error?: unknown })?.error === "string"
          ? (data as { error: string }).error
          : "Invalid PIN.";

      if (!res.ok) {
        setPinVerified(false);

        const nextAttempts = pinAttempts + 1;
        setPinAttempts(nextAttempts);
        setPinError(msg);

        if (nextAttempts >= MAX_PIN_ATTEMPTS) {
          const currentUser = await waitForUser();
          if (!currentUser) {
            setPinError("Unable to verify signed-in account.");
            return;
          }
          await blockUser(
            currentUser.uid,
            currentUser.email,
            "PIN entered incorrectly 3 times."
          );
        }
        return;
      }

      setPinVerified(true);
      setPinError("");
      setPinAttempts(0);
    } catch {
      setPinVerified(false);
      setPinError("Unable to reach /api/pin.");
    }
  }, [
    blockUser,
    isBlocked,
    pinAttempts,
    pinInput,
    pinLocked,
    waitForUser,
    buildFirebaseAuthHeader,
  ]);

  return {
    googleAuthed,
    googleUserId,
    googleError,
    pinInput,
    setPinInput,
    pinVerified,
    pinError,
    pinAttempts,
    pinLocked,
    verifyPin,
    DEV_SESSION_TOKEN_CONTROL_KEY,
    TOKEN_KEY,
    resetGate,
  };
}
