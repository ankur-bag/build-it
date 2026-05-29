"use client";

import React, { useState, useEffect } from "react";
import { PricingInfo } from "@/types/payment";
import BillingSummary from "./BillingSummary";
import { walletService } from "@/lib/payment/walletService";
import WalletModal from "./WalletModal";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiCheck, FiAlertCircle } from "react-icons/fi";
import { FaWallet } from "react-icons/fa";

interface DeductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  pricing: PricingInfo;
  userId: string;
  onConfirm: () => Promise<void>;
  title?: string;
  description?: string;
  theme?: "dark" | "light";
  isCallContext?: boolean;
}

export default function DeductionModal({
  isOpen,
  onClose,
  pricing,
  userId,
  onConfirm,
  title = "Confirm Launch",
  description = "Review your campaign settings before proceeding.",
  theme = "dark",
  isCallContext = false,
}: DeductionModalProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeducting, setIsDeducting] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);

  const fetchBalance = async () => {
    const b = await walletService.getBalance(userId);
    setBalance(b);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchBalance();
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const isRelaunch = title.toLowerCase().includes("relaunch");
  const requiredAmount = isCallContext 
    ? (pricing.callsCost || 0) 
    : (isRelaunch ? (pricing.relaunchCost || 0) : (pricing.launchCost ?? pricing.totalCost ?? 0));
  
  const hasEnoughBalance = balance !== null && balance >= requiredAmount;
  const remainingBalance = balance !== null ? Math.max(0, balance - requiredAmount) : 0;

  const handleDeduct = async () => {
    if (!hasEnoughBalance) {
      setShowTopUp(true);
      return;
    }
    setIsDeducting(true);
    try {
      await onConfirm();
    } catch (err) {
      console.error("Deduction failed:", err);
    } finally {
      setIsDeducting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`w-full max-w-sm rounded-[1.5rem] border p-6 space-y-5 relative shadow-2xl overflow-hidden ${
          theme === "dark" 
            ? "bg-slate-900/90 border-white/10 text-white" 
            : "bg-[#E1E0CC]/95 border-slate-300 text-slate-900"
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-full hover:bg-white/10 transition text-white/30 hover:text-white z-10"
        >
          <FiX className="text-sm" />
        </button>

        <div className="space-y-1 relative z-10">
          <h2 className="text-xl font-medium tracking-tight">
            {title}
          </h2>
          <p className="text-[11px] text-white/40 leading-relaxed max-w-[90%]">
            {description}
          </p>
        </div>

        <div className="relative z-10">
          <BillingSummary 
            pricing={pricing} 
            theme={theme} 
            isCallContext={isCallContext} 
          />
        </div>

        <div className={`relative z-10 rounded-xl p-4 space-y-4 ${theme === "dark" ? "bg-white/5" : "bg-white/40"}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-medium text-blue-400">
              <FaWallet className="text-[10px]" />
              Wallet Balance
            </div>
            <span className="text-xs font-mono text-white/90">
              ₹{loading ? "---" : balance?.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center text-red-400/80">
            <span className="text-[9px] uppercase tracking-widest font-medium">To be deducted</span>
            <span className="text-xs font-mono">-₹{requiredAmount.toLocaleString()}</span>
          </div>

          <div className={`pt-3 border-t ${theme === "dark" ? "border-white/5" : "border-slate-300"} text-emerald-400/90`}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-medium">
                <FiCheck className="text-[10px]" />
                Post-payment
              </div>
              <span className="text-xs font-mono">₹{loading ? "---" : remainingBalance.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 relative z-10 pt-2">
          {hasEnoughBalance ? (
            <button
              onClick={handleDeduct}
              disabled={isDeducting || loading}
              className={`w-full py-3.5 rounded-xl font-medium text-sm transition-all active:scale-95 disabled:opacity-50 shadow-lg ${
                theme === "dark" 
                  ? "bg-white text-slate-900 hover:bg-white/90" 
                  : "bg-slate-900 text-white hover:bg-slate-800"
              }`}
            >
              {isDeducting ? "Processing Payment..." : `Confirm Transaction`}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 flex items-center gap-2">
                <FiAlertCircle className="text-amber-500 text-xs shrink-0" />
                <p className="text-amber-500/90 text-[10px] font-medium leading-tight">
                  Insufficient funds. Please top up your wallet to continue.
                </p>
              </div>
              <button
                onClick={() => setShowTopUp(true)}
                className="w-full py-3.5 rounded-xl bg-blue-500 text-white font-medium text-sm hover:bg-blue-400 transition-all shadow-lg"
              >
                Refill Wallet
              </button>
            </div>
          )}
          
          <button
            onClick={onClose}
            className="w-full py-2 text-[10px] text-white/30 hover:text-white/60 transition-colors uppercase tracking-widest font-medium"
          >
            Go back to editing
          </button>
        </div>

        {showTopUp && (
          <WalletModal 
            isOpen={showTopUp} 
            onClose={() => setShowTopUp(false)} 
            currentBalance={balance || 0}
            onSuccess={fetchBalance}
          />
        )}
      </motion.div>
    </div>
  );
}
