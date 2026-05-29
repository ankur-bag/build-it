import React from "react";
import { PricingInfo } from "@/types/payment";
import { FiMessageSquare, FiMic, FiPhone } from "react-icons/fi";
import { CHANNEL_PRICING } from "@/lib/payment/constants";

interface PricingBreakdownProps {
  pricing: PricingInfo;
  theme?: "dark" | "light";
  isCallContext?: boolean;
  isRelaunch?: boolean;
}

export default function PricingBreakdown({ 
  pricing, 
  theme = "dark",
  isCallContext = false,
  isRelaunch = false
}: PricingBreakdownProps) {
  const isDark = theme === "dark";
  const textPrimary = isDark ? "text-white/90" : "text-slate-800";
  const textSecondary = isDark ? "text-white/40" : "text-slate-500";
  const bgCard = isDark ? "bg-white/5 border-white/10" : "bg-white/50 border-slate-200/60 shadow-sm";
  const borderCol = isDark ? "border-white/5" : "border-slate-200/50";

  const showWhatsapp = !isCallContext && pricing.whatsappCost > 0;
  const showVoice = !isCallContext && pricing.voiceCost > 0;
  const showCalls = (isCallContext || (!isRelaunch && !isCallContext)) && pricing.callsCost > 0;

  // Calculate per-lead costs
  const whatsappPerLead = pricing.contactsCount > 0 ? (pricing.whatsappCost / pricing.contactsCount).toFixed(2) : "0.00";
  const voicePerLead = pricing.contactsCount > 0 ? (pricing.voiceCost / pricing.contactsCount).toFixed(2) : "0.00";
  const callsPerLead = pricing.contactsCount > 0 ? (pricing.callsCost / pricing.contactsCount).toFixed(2) : "0.00";

  return (
    <div className={`rounded-xl border p-3 ${bgCard}`}>
      <h4 className={`text-[10px] font-medium mb-3 uppercase tracking-widest ${textSecondary}`}>
        Payment Summary
      </h4>
      
      <div className="space-y-3 font-sans text-xs">
        {showWhatsapp && (
          <div className={`flex justify-between items-center pb-2 border-b ${borderCol}`}>
            <div className="flex items-center gap-2">
              <FiMessageSquare className={`text-[11px] ${textSecondary}`} />
              <div>
                <span className={`font-medium ${textPrimary}`}>WhatsApp</span>
                <p className={`text-[9px] ${textSecondary}`}>
                  ₹{whatsappPerLead} × {pricing.contactsCount} leads
                </p>
              </div>
            </div>
            <span className={`font-mono text-xs ${textPrimary}`}>
              ₹{pricing.whatsappCost.toLocaleString("en-IN")}
            </span>
          </div>
        )}

        {showVoice && (
          <div className={`flex justify-between items-center pb-2 border-b ${borderCol}`}>
            <div className="flex items-center gap-2">
              <FiMic className={`text-[11px] ${textSecondary}`} />
              <div>
                <span className={`font-medium ${textPrimary}`}>Voice</span>
                <p className={`text-[9px] ${textSecondary}`}>
                  ₹{voicePerLead} × {pricing.contactsCount} leads
                </p>
              </div>
            </div>
            <span className={`font-mono text-xs ${textPrimary}`}>
              ₹{pricing.voiceCost.toLocaleString("en-IN")}
            </span>
          </div>
        )}

        {showCalls && (
          <div className={`flex justify-between items-center pb-2 border-b ${borderCol}`}>
            <div className="flex items-center gap-2">
              <FiPhone className={`text-[11px] ${textSecondary}`} />
              <div>
                <span className={`font-medium ${textPrimary}`}>AI Calling</span>
                <p className={`text-[9px] ${textSecondary}`}>
                  ₹{callsPerLead} × {pricing.contactsCount} leads
                </p>
              </div>
            </div>
            <span className={`font-mono text-xs ${textPrimary}`}>
              ₹{pricing.callsCost.toLocaleString("en-IN")}
            </span>
          </div>
        )}

        {!showWhatsapp && !showVoice && !showCalls && (
          <div className={`py-1 text-center italic ${textSecondary}`}>
            No details to display.
          </div>
        )}
      </div>
    </div>
  );
}
