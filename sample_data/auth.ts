"use client";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { firebaseAuthGate } from "@/app/gate/firebaseClient";

const provider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  const { firebaseApp, hasFirebaseConfig } = firebaseAuthGate();
  if (!firebaseApp || !hasFirebaseConfig) {
    throw new Error("Firebase auth is not configured.");
  }

  const auth = getAuth(firebaseApp);
  return signInWithPopup(auth, provider);
}

export async function signOutUser() {
  const { firebaseApp, hasFirebaseConfig } = firebaseAuthGate();
  if (!firebaseApp || !hasFirebaseConfig) return;

  const auth = getAuth(firebaseApp);
  await signOut(auth);
}
