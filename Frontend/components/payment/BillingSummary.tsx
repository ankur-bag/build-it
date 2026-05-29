import React from "react";
import { PricingInfo } from "@/types/payment";
import PricingBreakdown from "./PricingBreakdown";
import { FiUsers, FiLayers } from "react-icons/fi";

interface BillingSummaryProps {
  pricing: PricingInfo;
  theme?: "dark" | "light";
  isCallContext?: boolean;
}

export default function BillingSummary({ 
  pricing, 
  theme = "dark",
  isCallContext = false 
}: BillingSummaryProps) {
  const isDark = theme === "dark";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-white/40" : "text-slate-500";
  const bgCard = isDark ? "bg-white/5 border-white/10" : "bg-white/60 border-slate-200/80 shadow-md";

  const displayAmount = isCallContext ? (pricing.callsCost || 0) : (pricing.launchCost ?? pricing.totalCost);

  return (
    <div className={`rounded-xl border p-4 space-y-4 ${bgCard}`}>
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
        <div>
          <h3 className={`text-sm font-medium ${textPrimary}`}>
            {isCallContext ? "AI Calling Fees" : "Launch Fees"}
          </h3>
          <p className={`text-[10px] mt-0.5 ${textSecondary}`}>
            {isCallContext 
              ? `Processing ${pricing.contactsCount} individual calls` 
              : "WhatsApp + Voice + First AI Call Round"}
          </p>
        </div>
        <div className="text-left md:text-right">
          <span className={`text-xl font-medium tracking-tight ${textPrimary}`}>
            ₹{displayAmount.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className={`p-3 rounded-xl ${isDark ? "bg-white/5" : "bg-slate-100/50 border border-slate-200/40"}`}>
          <div className="flex items-center gap-1.5 mb-1 text-[9px] uppercase tracking-widest font-medium text-white/30">
            <FiUsers className="text-[10px]" />
            Leads
          </div>
          <p className={`font-sans text-sm ${textPrimary}`}>{pricing.contactsCount.toLocaleString("en-IN")}</p>
        </div>
        <div className={`p-3 rounded-xl ${isDark ? "bg-white/5" : "bg-slate-100/50 border border-slate-200/40"}`}>
          <div className="flex items-center gap-1.5 mb-1 text-[9px] uppercase tracking-widest font-medium text-white/30">
            <FiLayers className="text-[10px]" />
            Channels
          </div>
          <p className={`font-sans text-xs truncate ${textPrimary}`}>
            {pricing.selectedChannels.length > 0 ? pricing.selectedChannels.join(", ") : "None"}
          </p>
        </div>
      </div>

      <PricingBreakdown pricing={pricing} theme={theme} isCallContext={isCallContext} />
    </div>
  );
}
