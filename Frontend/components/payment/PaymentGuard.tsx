import React, { useState, useEffect } from "react";
import { walletService } from "@/lib/payment/walletService";
import { firestorePayment } from "@/lib/payment/firestorePayment";
import DeductionModal from "./DeductionModal";
import { calculateCampaignCost } from "@/lib/payment/calculator";
import { PricingInfo } from "@/types/payment";

interface PaymentGuardProps {
  campaign: any;
  userId: string;
  onSuccess: () => void;
  children: React.ReactElement<any>;
}

export default function PaymentGuard({
  campaign,
  userId,
  onSuccess,
  children,
}: PaymentGuardProps) {
  const [checking, setChecking] = useState(false);
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  const [pricing, setPricing] = useState<PricingInfo | null>(null);

  const campaignId = campaign.id || campaign.campaignId;
  const contactsCount = campaign.contactCount || campaign.contacts?.length || 0;

  useEffect(() => {
    const info = calculateCampaignCost(campaign.channels, contactsCount);
    setPricing(info);
  }, [campaign, contactsCount]);

  const handleIntercept = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (checking) return;
    setChecking(true);

    try {
      const currentCount = await firestorePayment.getCallCount(campaignId);
      
      if (currentCount === 0) {
        // First execution is free
        await firestorePayment.recordPayment({
          campaignId,
          userId,
          paymentType: "call",
          status: "paid",
          lastAmount: 0,
          makeCallCount: 1,
        });
        setChecking(false);
        onSuccess();
      } else {
        // Subsequent executions require payment - show modal
        setChecking(false);
        setShowDeductionModal(true);
      }
    } catch (err) {
      console.error("Error in PaymentGuard intercept:", err);
      setChecking(false);
    }
  };

  const handleConfirmDeduction = async () => {
    const requiredAmount = pricing?.callsCost || 0;
    
    // We already know it's not the first call if we're here
    const currentCount = await firestorePayment.getCallCount(campaignId);

    try {
      const success = await walletService.deductMoney(userId, requiredAmount, campaignId, "call");
      if (success) {
        await firestorePayment.recordPayment({
          campaignId,
          userId,
          paymentType: "call",
          status: "paid",
          lastAmount: requiredAmount,
          makeCallCount: currentCount + 1,
        });
        setShowDeductionModal(false);
        onSuccess();
      }
    } catch (err) {
      console.error("Failed to deduct wallet for calls:", err);
    }
  };

  const child = React.Children.only(children);

  return (
    <>
      {React.cloneElement(child, {
        onClick: handleIntercept,
        disabled: checking || child.props.disabled,
        children: checking ? "Authorizing..." : child.props.children
      })}

      {showDeductionModal && pricing && (
        <DeductionModal
          isOpen={showDeductionModal}
          onClose={() => setShowDeductionModal(false)}
          userId={userId}
          pricing={pricing}
          onConfirm={handleConfirmDeduction}
          isCallContext={true}
          title="Confirm AI Calls"
          description="You are initiating AI calls for all contacts in this campaign."
        />
      )}
    </>
  );
}
