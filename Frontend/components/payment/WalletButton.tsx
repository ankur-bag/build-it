"use client";

import React, { useState, useEffect } from "react";
import { walletService } from "@/lib/payment/walletService";
import WalletModal from "./WalletModal";
import { useAuth } from "@clerk/nextjs";

export default function WalletButton() {
  const { userId } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchBalance = async () => {
    if (!userId) return;
    const current = await walletService.getBalance(userId);
    setBalance(current);
  };

  useEffect(() => {
    fetchBalance();
    
    // Refresh balance periodically or on focus
    const interval = setInterval(fetchBalance, 10000);
    window.addEventListener('focus', fetchBalance);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', fetchBalance);
    };
  }, [userId]);

  if (!userId) return null;

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="group relative flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer"
      >
        <div className="flex flex-col items-start text-left">
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Wallet</span>
          <span className="text-sm font-bold text-white font-instrument tracking-tight">
            ₹{balance !== null ? balance.toLocaleString() : "..."}
          </span>
        </div>
        <div className="w-8 h-8 rounded-xl bg-[#E1E0CC] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <span className="text-slate-900 text-lg">+</span>
        </div>
      </button>

      {isModalOpen && (
        <WalletModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          currentBalance={balance || 0}
          onSuccess={fetchBalance}
        />
      )}
    </>
  );
}
