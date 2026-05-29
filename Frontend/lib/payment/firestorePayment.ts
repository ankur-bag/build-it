import { db } from "@/lib/firebase/client";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  serverTimestamp
} from "firebase/firestore";
import { PaymentRecord } from "@/types/payment";

export const firestorePayment = {
  async getWalletBalance(userId: string): Promise<number> {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        return userDoc.data().walletBalance || 0;
      }
      return 0;
    } catch (error) {
      console.error("Error getting wallet balance:", error);
      return 0;
    }
  },

  async updateWalletBalance(userId: string, amount: number): Promise<void> {
    const userRef = doc(db, "users", userId);
    try {
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        await updateDoc(userRef, {
          walletBalance: increment(amount)
        });
      } else {
        await setDoc(userRef, {
          walletBalance: amount
        }, { merge: true });
      }
    } catch (error) {
      console.error("Error updating wallet balance:", error);
      throw error;
    }
  },

  async recordPayment(record: Partial<PaymentRecord>): Promise<string> {
    const paymentBatchRef = collection(db, "payments");
    const newDocRef = doc(paymentBatchRef);
    const paymentId = newDocRef.id;

    const finalRecord = {
      ...record,
      id: paymentId,
      createdAt: serverTimestamp(),
      paidAt: record.status === "paid" ? serverTimestamp() : null,
    };

    await setDoc(newDocRef, finalRecord);
    return paymentId;
  },

  async getCampaignPaymentInfo(campaignId: string): Promise<PaymentRecord | null> {
    try {
      const q = query(
        collection(db, "payments"),
        where("campaignId", "==", campaignId),
        where("status", "==", "paid")
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) return null;

      // Find the latest record or specific type if needed
      // For simplicity, we just return the first one found or we could sort
      return querySnapshot.docs[0].data() as PaymentRecord;
    } catch (error) {
      console.error("Error getting campaign payment info:", error);
      return null;
    }
  },

  async getCallCount(campaignId: string): Promise<number> {
    const q = query(
      collection(db, "payments"),
      where("campaignId", "==", campaignId),
      where("paymentType", "==", "call"),
      where("status", "==", "paid")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  }
};
