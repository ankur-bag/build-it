import React from "react";
import { calculateCampaignCost } from "@/lib/payment/calculator";
import BillingSummary from "./BillingSummary";
import PaymentButton from "./PaymentButton";
import { PaymentRecord } from "@/types/payment";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: any;
  userId: string;
  userName?: string;
  userEmail?: string;
  nextExecutionCount: number;
  onPaymentSuccess: (record: PaymentRecord) => void;
  theme?: "dark" | "light";
}

export default function PaymentModal({
  isOpen,
  onClose,
  campaign,
  userId,
  userName,
  userEmail,
  nextExecutionCount,
  onPaymentSuccess,
  theme = "light",
}: PaymentModalProps) {
  if (!isOpen) return null;

  const contactsCount = campaign.contactCount || campaign.contacts?.length || 0;
  const pricing = calculateCampaignCost(campaign.channels, contactsCount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        className={`w-full max-w-lg rounded-[2.5rem] border p-6 md:p-8 space-y-6 relative animate-in fade-in zoom-in-95 duration-200 shadow-2xl ${
          theme === "dark" 
            ? "bg-slate-900 border-white/10 text-white" 
            : "bg-[#E1E0CC] border-white/60 text-slate-900"
        }`}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/10 transition cursor-pointer text-sm font-bold"
        >
          ✕
        </button>

        <div className="space-y-1 pr-6">
          <h2 className="text-2xl font-bold font-instrument tracking-tight">Relaunch Call Payment</h2>
          <p className="text-xs opacity-70">
            Subsequent call executions (relaunching calls) require a dynamic balance payment.
          </p>
        </div>

        <BillingSummary pricing={pricing} theme={theme} />

        <div className="space-y-3 pt-2">
          <PaymentButton
            amount={pricing.totalCost}
            campaignId={campaign.id || campaign.campaignId}
            userId={userId}
            userName={userName}
            userEmail={userEmail}
            paymentType="call"
            callExecutionCount={nextExecutionCount}
            contactsCount={contactsCount}
            selectedChannels={pricing.selectedChannels}
            onPaymentSuccess={onPaymentSuccess}
            theme={theme}
          />
          
          <button
            onClick={onClose}
            className="w-full text-center text-xs opacity-60 hover:opacity-100 transition-opacity font-semibold py-1 cursor-pointer"
          >
            Cancel & Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
