import { firestorePayment } from "./firestorePayment";

export const walletService = {
  async getBalance(userId: string): Promise<number> {
    const balance = await firestorePayment.getWalletBalance(userId);
    // Fallback to local storage if firestore fails (as requested in "PAYMENT FALLBACK")
    if (typeof window !== "undefined" && balance === 0) {
      const localBalance = localStorage.getItem(`wallet_${userId}`);
      return localBalance ? parseFloat(localBalance) : 0;
    }
    return balance;
  },

  async addMoney(userId: string, amount: number, paymentId: string): Promise<void> {
    await firestorePayment.updateWalletBalance(userId, amount);
    await firestorePayment.recordPayment({
      userId,
      amount: amount,
      paymentType: "wallet",
      lastPaymentId: paymentId,
      status: "paid",
    } as any);

    // Update local storage fallback
    if (typeof window !== "undefined") {
      const current = await this.getBalance(userId);
      localStorage.setItem(`wallet_${userId}`, current.toString());
    }
  },

  async deductMoney(userId: string, amount: number, campaignId: string, type: "launch" | "call" | "relaunch"): Promise<boolean> {
    const currentBalance = await this.getBalance(userId);
    if (currentBalance < amount) return false;

    await firestorePayment.updateWalletBalance(userId, -amount);
    
    // Update local storage fallback
    if (typeof window !== "undefined") {
      localStorage.setItem(`wallet_${userId}`, (currentBalance - amount).toString());
    }

    return true;
  }
};
