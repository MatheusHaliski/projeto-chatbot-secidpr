// Firestore Timestamp compatible type (works for both client and admin SDK)
export interface Timestamp {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
}
