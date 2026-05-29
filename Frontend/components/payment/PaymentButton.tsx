import React, { useState } from "react";
import { openRazorpayCheckout } from "@/lib/payment/razorpay";
import { paymentService } from "@/lib/payment/paymentService";
import { PaymentRecord } from "@/types/payment";

interface PaymentButtonProps {
  amount: number;
  campaignId: string;
  userId: string;
  paymentType: "launch" | "call";
  callExecutionCount?: number;
  contactsCount: number;
  selectedChannels: string[];
  onPaymentSuccess: (record: PaymentRecord) => void;
  theme?: "dark" | "light";
  disabled?: boolean;
  userEmail?: string;
  userName?: string;
}

export default function PaymentButton({
  amount,
  campaignId,
  userId,
  paymentType,
  callExecutionCount = 0,
  contactsCount,
  selectedChannels,
  onPaymentSuccess,
  theme = "dark",
  disabled = false,
  userEmail,
  userName,
}: PaymentButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePay = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      await openRazorpayCheckout({
        amount: Math.round(amount * 100), // convert to paise
        name: "OutreachX",
        description: `${paymentType === "launch" ? "Campaign Launch" : "AI Call Execution"} - ${campaignId}`,
        prefill: {
          name: userName,
          email: userEmail,
        },
        onSuccess: async (razorpayPaymentId) => {
          try {
            console.log("💳 [PaymentButton] Razorpay checkout success:", razorpayPaymentId);
            const record = await paymentService.recordPayment({
              campaignId,
              userId,
              status: "paid",
              paymentType,
              lastAmount: amount,
              contactsCount,
              selectedChannels,
              lastPaymentId: razorpayPaymentId,
              makeCallCount: callExecutionCount,
              launchPaid: paymentType === "launch",
            });
            onPaymentSuccess(record);
          } catch (err) {
            console.error("Error storing payment record:", err);
          } finally {
            setIsProcessing(false);
          }
        },
        onDismiss: () => {
          console.log("Payment canceled by user");
          setIsProcessing(false);
        },
        onError: (errMessage) => {
          console.error("💳 [PaymentButton] Razorpay checkout failed:", errMessage);
          setIsProcessing(false);
        },
      });
    } catch (error) {
      console.error("Error opening checkout:", error);
      setIsProcessing(false);
    }
  };

  const buttonStyle = theme === "dark"
    ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold focus:ring-emerald-400/50"
    : "bg-slate-900 hover:bg-slate-800 text-white font-bold focus:ring-slate-900/50";

  return (
    <button
      onClick={handlePay}
      disabled={disabled || isProcessing || amount <= 0}
      className={`w-full py-3.5 px-6 rounded-2xl transition duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center gap-2 shadow-lg shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${buttonStyle}`}
    >
      {isProcessing ? (
        <>
          <span className="animate-spin text-lg">⏳</span>
          Processing Payment...
        </>
      ) : (
        <>
          💳 Pay ₹{amount.toLocaleString("en-IN")} Now
        </>
      )}
    </button>
  );
}
