"use client";

import {
  FacebookAuthProvider,
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  type UserCredential,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { firebaseAuthGate } from "@/app/gate/firebaseClient";

const provider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

provider.setCustomParameters({ prompt: "select_account" });

export type OAuthErrorDetails = {
  code: string;
  message: string;
  providerId?: string;
  operationType?: string;
  credentialProviderId?: string;
  tokenResponseError?: string;
  isDeletedClient: boolean;
};

export const DELETED_GOOGLE_CLIENT_USER_MESSAGE = "Login temporarily unavailable. Please try again later.";

export function extractOAuthErrorDetails(error: unknown): OAuthErrorDetails {
  const err = (error ?? {}) as {
    code?: string;
    message?: string;
    customData?: { _tokenResponse?: { error?: string }; operationType?: string; providerId?: string };
    credential?: { providerId?: string };
  };
  const tokenResponseError = err.customData?._tokenResponse?.error;
  const loweredMessage = (err.message ?? "").toLowerCase();
  const loweredTokenError = (tokenResponseError ?? "").toLowerCase();
  const isDeletedClient = loweredMessage.includes("deleted_client") || loweredTokenError.includes("deleted_client");

  return {
    code: err.code ?? "auth/unknown",
    message: err.message ?? "Unknown OAuth error.",
    providerId: err.customData?.providerId,
    operationType: err.customData?.operationType,
    credentialProviderId: err.credential?.providerId,
    tokenResponseError,
    isDeletedClient,
  };
}

export function resolveOAuthUserMessage(
  error: unknown,
  fallbackMessage: string
): string {
  const oauthError = extractOAuthErrorDetails(error);
  if (oauthError.isDeletedClient) {
    return DELETED_GOOGLE_CLIENT_USER_MESSAGE;
  }
  return fallbackMessage;
}

export async function signInWithGoogle() {
  const { firebaseApp, hasFirebaseConfig } = firebaseAuthGate();
  if (!firebaseApp || !hasFirebaseConfig) {
    throw new Error("Firebase auth is not configured.");
  }

  const auth = getAuth(firebaseApp);
  return signInWithPopup(auth, provider);
}

export async function signInWithGoogleRedirect() {
  const { firebaseApp, hasFirebaseConfig } = firebaseAuthGate();
  if (!firebaseApp || !hasFirebaseConfig) {
    throw new Error("Firebase auth is not configured.");
  }

  const auth = getAuth(firebaseApp);
  return signInWithRedirect(auth, provider);
}

export async function signInWithFacebook(): Promise<UserCredential> {
  const { firebaseApp, hasFirebaseConfig } = firebaseAuthGate();
  if (!firebaseApp || !hasFirebaseConfig) {
    throw new Error("Firebase auth is not configured.");
  }

  const auth = getAuth(firebaseApp);
  return signInWithPopup(auth, facebookProvider);
}

export async function signOutUser() {
  const { firebaseApp, hasFirebaseConfig } = firebaseAuthGate();
  if (!firebaseApp || !hasFirebaseConfig) return;

  const auth = getAuth(firebaseApp);
  await signOut(auth);
}
