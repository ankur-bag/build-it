import { db } from "@/lib/firebase/client";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { PaymentRecord } from "@/types/payment";

const LOCAL_STORAGE_KEY = "outreachx_payments_fallback";

// Local storage fallback helpers
function getLocalPayments(): PaymentRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error("Failed to read from localStorage:", err);
    return [];
  }
}

function saveLocalPayment(payment: PaymentRecord) {
  if (typeof window === "undefined") return;
  try {
    const current = getLocalPayments();
    // Prevent duplicate entries
    const updated = current.filter((p) => p.id !== payment.id);
    updated.push(payment);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to write to localStorage:", err);
  }
}

export const paymentService = {
  /**
   * Save a payment record.
   * Tries Firestore first. If it fails, falls back to localStorage.
   */
  async recordPayment(
    paymentData: Omit<PaymentRecord, "createdAt">
  ): Promise<PaymentRecord> {
    const paymentId = paymentData.id || `pay_${paymentData.campaignId}_${paymentData.paymentType}_${Date.now()}`;
    
    const record: PaymentRecord = {
      ...paymentData,
      id: paymentId,
      createdAt: new Date().toISOString(),
      paidAt: paymentData.status === "paid" ? new Date().toISOString() : undefined,
    };

    // Save to localStorage as a safety copy
    saveLocalPayment(record);

    try {
      console.log(`📡 [PaymentService] Recording payment in Firestore...`, record);
      const docRef = doc(db, "payments", paymentId);
      await setDoc(docRef, {
        ...record,
        createdAt: Timestamp.now(),
        paidAt: record.paidAt ? Timestamp.now() : null,
      }, { merge: true });
      console.log(`✅ [PaymentService] Payment recorded in Firestore:`, paymentId);
    } catch (err) {
      console.warn(
        `⚠️ [PaymentService] Firestore is unavailable. Saved locally in localStorage fallback.`,
        err
      );
    }

    return record;
  },

  /**
   * Check if a launch payment exists and is paid.
   */
  async getLaunchPayment(campaignId: string): Promise<PaymentRecord | null> {
    try {
      console.log(`📡 [PaymentService] Querying launch payment for campaign:`, campaignId);
      const q = query(
        collection(db, "payments"),
        where("campaignId", "==", campaignId),
        where("paymentType", "==", "launch"),
        where("status", "==", "paid")
      );
      
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docData = snap.docs[0].data();
        return {
          ...docData,
          id: snap.docs[0].id,
          createdAt: docData.createdAt?.toDate?.() || docData.createdAt,
          paidAt: docData.paidAt?.toDate?.() || docData.paidAt,
        } as PaymentRecord;
      }
    } catch (err) {
      console.warn("⚠️ [PaymentService] Firestore query failed. Querying local storage...");
    }

    // Local fallback
    const local = getLocalPayments();
    const match = local.find(
      (p) =>
        p.campaignId === campaignId &&
        p.paymentType === "launch" &&
        p.status === "paid"
    );
    return match || null;
  },

  /**
   * Get all call execution payments for a campaign.
   */
  async getCallPayments(campaignId: string): Promise<PaymentRecord[]> {
    try {
      console.log(`📡 [PaymentService] Querying call payments for campaign:`, campaignId);
      const q = query(
        collection(db, "payments"),
        where("campaignId", "==", campaignId),
        where("paymentType", "==", "call"),
        where("status", "==", "paid")
      );

      const snap = await getDocs(q);
      const records: PaymentRecord[] = [];
      snap.forEach((docSnap) => {
        const docData = docSnap.data();
        records.push({
          ...docData,
          id: docSnap.id,
          createdAt: docData.createdAt?.toDate?.() || docData.createdAt,
          paidAt: docData.paidAt?.toDate?.() || docData.paidAt,
        } as PaymentRecord);
      });
      return records;
    } catch (err) {
      console.warn("⚠️ [PaymentService] Firestore query failed. Querying local storage...");
    }

    // Local fallback
    const local = getLocalPayments();
    return local.filter(
      (p) => p.campaignId === campaignId && p.paymentType === "call"
    );
  },

  /**
   * Helper to count call executions.
   */
  async getCallExecutionCount(campaignId: string): Promise<number> {
    const callPayments = await this.getCallPayments(campaignId);
    // Find maximum makeCallCount in the records, or if none, return 0
    if (callPayments.length === 0) return 0;
    
    // Sort descending by execution count
    const sorted = [...callPayments].sort((a, b) => (b.makeCallCount || 0) - (a.makeCallCount || 0));
    return sorted[0].makeCallCount || 0;
  }
};
