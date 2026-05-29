"use client";

import React from "react";
import { WALLET_QUICK_AMOUNTS } from "@/lib/payment/constants";

interface AddMoneyCardProps {
  onAdd: (amount: number) => void;
  disabled?: boolean;
}

export default function AddMoneyCard({ onAdd, disabled }: AddMoneyCardProps) {
  return (
    <div className="space-y-3">
      <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold ml-1">Quick Add</span>
      <div className="grid grid-cols-3 gap-2">
        {WALLET_QUICK_AMOUNTS.map((amt) => (
          <button
            key={amt}
            onClick={() => onAdd(amt)}
            disabled={disabled}
            className="py-3 rounded-xl bg-white/5 border border-white/5 text-white/80 text-xs font-medium hover:bg-white hover:text-slate-900 transition-all duration-300 disabled:opacity-50 active:scale-95"
          >
            ₹{amt.toLocaleString()}
          </button>
        ))}
      </div>
    </div>
  );
}
