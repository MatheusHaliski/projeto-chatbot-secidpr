
import { useCallback, useEffect, useMemo, useState } from "react";
import {usePathname, useRouter} from "next/navigation";
import { firebaseAuthGate } from "./firebaseClient";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithPopup,
  signInWithCredential,
  signOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore/lite";
import {
  clearDevSessionToken,
  DEV_SESSION_TOKEN_KEY,
} from "@/app/lib/devSession";
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

export function useAuthGate(): UseAuthGateReturn  {
// ============================
// constants
// ============================
  const TOKEN_KEY = DEV_SESSION_TOKEN_KEY;
  const DEV_SESSION_TOKEN_CONTROL_KEY = "false";
  const router = useRouter();

  const [googleAuthed, setGoogleAuthed] = useState(false);
  const [googleUserId, setGoogleUserId] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [pinVerified, setPinVerified] = useState(false);
  const [pinError, setPinError] = useState("");
  const [pinAttempts, setPinAttempts] = useState(0);
  const [googleError, setGoogleError] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const { firebaseApp, hasFirebaseConfig } = firebaseAuthGate();
  const MAX_PIN_ATTEMPTS = 3;
  const ALLOWED_GOOGLE_EMAIL = "matheushaliski@gmail.com";
  const pinLocked = pinAttempts >= MAX_PIN_ATTEMPTS;
  const db = getDb();


// ============================
// firebase auth helpers
// ============================
  const auth =
      typeof window !== "undefined" && firebaseApp ? getAuth(firebaseApp) : null;

  const provider = new GoogleAuthProvider();

  if (typeof window !== "undefined" && auth) {
    setPersistence(auth, browserLocalPersistence).catch(() => {
    });
  }

  useEffect(() => {
    if (!auth) {
      setAuthReady(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, () => {
      setAuthReady(true);
    });
    return () => {
      unsubscribe();
      setAuthReady(false);
    };
  }, [auth]);

  const ensureAuthReady = useCallback(async () => {
    if (authReady) return;
    await new Promise<void>((resolve) => {
      const check = () => {
        if (authReady) {
          resolve();
          return;
        }
        setTimeout(check, 50);
      };
      check();
    });
  }, [authReady]);

  const resetGate = useCallback(() => {
    setGoogleAuthed(false);
    setGoogleUserId("");
    setPinVerified(false);
    setPinInput("");
    setPinError("");
    setPinAttempts(0);
    setGoogleError("");
    setSessionToken("");
    setIsBlocked(false);
  }, []);


  const signInWithGoogleIdToken = (idToken: string) => {
    if (!auth) {
      return Promise.reject(new Error("Firebase auth is not configured."));
    }
    const cred = GoogleAuthProvider.credential(idToken);
    return signInWithCredential(auth, cred);
  };

  const checkBlockedUser = useCallback(
    async (email: string) => {
      if (!db || !hasFirebaseConfig) return false;
      const normalizedEmail = email.toLowerCase();
      const blockedRef = doc(db, "blousers", normalizedEmail);
      const blockedSnap = await getDoc(blockedRef);
      if (blockedSnap.exists()) {
        setIsBlocked(true);
        setGoogleAuthed(false);
        setGoogleUserId("");
        setGoogleError("Account blocked. Please contact support.");
        return true;
      }
      setIsBlocked(false);
      return false;
    },
    [db, hasFirebaseConfig]
  );

  const blockUser = useCallback(
    async (email: string, reason: string) => {
      if (!db || !hasFirebaseConfig) return;
      const normalizedEmail = email.toLowerCase();
      await setDoc(doc(db, "blousers", normalizedEmail), {
        email: normalizedEmail,
        blockedAt: serverTimestamp(),
        reason,
      });
      setIsBlocked(true);
      setGoogleAuthed(false);
      setGoogleUserId("");
      setPinError("Account blocked. Please contact support.");
      setGoogleError("Account blocked. Please contact support.");
      if (auth) {
        await signOut(auth);
      }
    },
    [auth, db, hasFirebaseConfig]
  );


// ============================
// helpers
// ============================
  function createToken(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const b64 = btoa(String.fromCharCode(...bytes));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

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

  const clientId ="457209482063-s3q59rtck2dg6mcruuq2qbea1ee7ofe8.apps.googleusercontent.com";

  console.log("IS:",clientId);



  const handleGoogleResponse = useCallback(async (response: GoogleCredentialResponse) => {
    try {
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
      if (await checkBlockedUser(normalizedEmail)) {
        return;
      }
      await ensureAuthReady();
      if (await checkBlockedUser(normalizedEmail)) {
        return;
      }

      await signInWithGoogleIdToken(idToken);

      setGoogleUserId(userId || "Unknown user");
      setGoogleAuthed(true);
      setGoogleError("");
    } catch (e: unknown) {
      console.error("[AuthGate] Firebase sign-in failed:", e);
      setGoogleError("Failed to sign in to Firebase.");
      setGoogleAuthed(false);
    }
  }, [checkBlockedUser, ensureAuthReady, signInWithGoogleIdToken]);

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
      const res = await fetch("/api/pin", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({pin: normalized}),
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
        if (nextAttempts >= MAX_PIN_ATTEMPTS && googleUserId) {
          await blockUser(googleUserId, "PIN entered incorrectly 3 times.");
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
  }, [blockUser, googleUserId, isBlocked, pinInput, pinAttempts, pinLocked]);


  // load Google SDK
  useEffect(() => {
    if (!clientId) {
      setGoogleError("Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID.");
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
          {theme: "outline", size: "large", text: "continue_with"}
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
      document.body.removeChild(script);
    };
  }, [clientId, handleGoogleResponse]);


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
    resetGate
  };

}
