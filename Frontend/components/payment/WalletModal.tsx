"use client";

import React, { useState } from "react";
import { WALLET_QUICK_AMOUNTS } from "@/lib/payment/constants";
import { openRazorpayCheckout } from "@/lib/payment/razorpay";
import { walletService } from "@/lib/payment/walletService";
import { useAuth, useUser } from "@clerk/nextjs";
import AddMoneyCard from "./AddMoneyCard";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onSuccess: () => void;
}

export default function WalletModal({
  isOpen,
  onClose,
  currentBalance,
  onSuccess,
}: WalletModalProps) {
  const { userId } = useAuth();
  const { user } = useUser();
  const [amount, setAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleAddMoney = async (customAmount?: number) => {
    const finalAmount = customAmount || parseFloat(amount);
    if (!finalAmount || finalAmount <= 0) return;
    if (!userId) return;

    setIsProcessing(true);

    try {
      await openRazorpayCheckout({
        amount: Math.round(finalAmount * 100), // convert to paise
        name: "OutreachX Wallet",
        description: "Add Money to Wallet",
        prefill: {
          name: user?.fullName || "",
          email: user?.primaryEmailAddress?.emailAddress || "",
        },
        onSuccess: async (razorpayPaymentId) => {
          await walletService.addMoney(userId, finalAmount, razorpayPaymentId);
          onSuccess();
          onClose();
          setIsProcessing(false);
        },
        onError: (error) => {
          console.error("Payment failed:", error);
          setIsProcessing(false);
        }
      });
    } catch (error) {
      console.error("Wallet checkout error:", error);
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="w-full max-w-md bg-slate-900/90 border border-white/10 rounded-[2rem] p-7 space-y-6 relative shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />

        <div className="flex justify-between items-start relative z-10">
          <div className="space-y-1">
            <h2 className="text-2xl font-medium text-white tracking-tight">Your Wallet</h2>
            <p className="text-[11px] text-white/40 uppercase tracking-widest font-medium">Manage your balance</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/10 rounded-full transition text-white/20 hover:text-white"
          >
            <span className="text-xs">✕</span>
          </button>
        </div>

        <div className="bg-white/5 border border-white/5 rounded-2xl p-6 text-center relative z-10">
          <span className="text-[10px] text-blue-400 uppercase tracking-widest font-bold">Current Balance</span>
          <div className="text-4xl font-sans font-medium text-white mt-1">
            ₹{currentBalance.toLocaleString()}
          </div>
        </div>

        <div className="relative z-10">
          <AddMoneyCard onAdd={handleAddMoney} disabled={isProcessing} />
        </div>

        <div className="space-y-3 relative z-10">
          <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold ml-1">Custom Amount</span>
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 font-medium">₹</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-10 pr-6 text-white text-sm font-medium focus:outline-none focus:border-white/20 transition-all font-mono"
            />
          </div>
        </div>

        <button
          onClick={() => handleAddMoney()}
          disabled={isProcessing || !amount}
          className="w-full py-4 rounded-xl bg-white text-slate-900 font-bold text-sm hover:bg-white/90 active:scale-[0.98] transition-all shadow-xl disabled:opacity-50 relative z-10"
        >
          {isProcessing ? "Processing..." : "Add Money"}
        </button>
      </div>
    </div>
  );
}
