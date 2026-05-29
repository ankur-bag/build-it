import React, { useState, useEffect } from "react";
import { walletService } from "@/lib/payment/walletService";
import { firestorePayment } from "@/lib/payment/firestorePayment";
import DeductionModal from "./DeductionModal";
import { calculateCampaignCost } from "@/lib/payment/calculator";
import { PricingInfo } from "@/types/payment";

interface LaunchGuardProps {
  campaign?: any;
  campaignId?: string;
  userId: string;
  requiredAmount?: number;
  onSuccess: () => void;
  children: React.ReactElement<any>;
  relaunch?: boolean;
}

export default function LaunchGuard({ 
  campaign,
  campaignId: propCampaignId, 
  userId, 
  requiredAmount, 
  onSuccess,
  children,
  relaunch = false
}: LaunchGuardProps) {
  const [isPaid, setIsPaid] = useState(false);
  const [checking, setChecking] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeducting, setIsDeducting] = useState(false);
  const [pricing, setPricing] = useState<PricingInfo | null>(null);

  const campaignId = propCampaignId || campaign?.id || campaign?.campaignId || "";

  useEffect(() => {
    const checkStatus = async () => {
      try {
        if (!relaunch) {
          const paymentInfo = await firestorePayment.getCampaignPaymentInfo(campaignId);
          if (paymentInfo?.launchPaid) {
            setIsPaid(true);
          }
        }
        
        // Prepare pricing info for modal
        const contactsCount = campaign?.contactCount || campaign?.contactCount || 0;
        const info = calculateCampaignCost(campaign?.channels || {}, contactsCount);
        setPricing(info);

      } catch (err) {
        console.error("Error checking launch status:", err);
      } finally {
        setChecking(false);
      }
    };
    checkStatus();
  }, [campaignId, userId, relaunch, campaign]);

  const handleIntercept = (e: React.MouseEvent) => {
    if (isPaid && !relaunch) return; 
    
    e.preventDefault();
    e.stopPropagation();
    setIsModalOpen(true);
  };

  const handleConfirmDeduction = async () => {
    const cost = requiredAmount || (relaunch ? (pricing?.relaunchCost || 0) : (pricing?.launchCost || 0));
    
    setIsDeducting(true);
    try {
      const type = relaunch ? "relaunch" : "launch";
      const success = await walletService.deductMoney(userId, cost, campaignId, type);
      if (success) {
        await firestorePayment.recordPayment({
          campaignId,
          userId,
          launchPaid: !relaunch,
          lastAmount: cost,
          paymentType: type,
          status: "paid",
        });
        if (!relaunch) setIsPaid(true);
        setIsModalOpen(false);
        onSuccess();
      }
    } catch (err) {
      console.error("Failed to deduct wallet:", err);
    } finally {
      setIsDeducting(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center gap-2 text-white/40 text-sm font-medium animate-pulse">
        <span className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin"></span>
        Validating...
      </div>
    );
  }

  if (isPaid && !relaunch) {
    return <>{children}</>;
  }

  const child = React.Children.only(children);

  return (
    <>
      {React.cloneElement(child, {
        onClick: handleIntercept,
        disabled: isDeducting
      })}

      {isModalOpen && pricing && (
        <DeductionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          userId={userId}
          pricing={pricing}
          onConfirm={handleConfirmDeduction}
          title={relaunch ? "Confirm Relaunch" : "Confirm Launch"}
          description={relaunch 
            ? "Adding new leads to your existing campaign." 
            : "Initial launch includes WhatsApp, Voice, and the first AI calling round."
          }
        />
      )}
    </>
  );
}
