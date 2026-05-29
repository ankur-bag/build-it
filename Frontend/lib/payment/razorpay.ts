let scriptLoadingPromise: Promise<boolean> | null = null;

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if ((window as any).Razorpay) return Promise.resolve(true);
  
  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      scriptLoadingPromise = null;
      resolve(true);
    };
    script.onerror = () => {
      scriptLoadingPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return scriptLoadingPromise;
}

export interface RazorpayOptions {
  amount: number; // in paise
  name: string;
  description: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  onSuccess: (paymentId: string) => void;
  onDismiss?: () => void;
  onError?: (errorMessage: string) => void;
}

export async function openRazorpayCheckout({
  amount,
  name,
  description,
  prefill,
  onSuccess,
  onDismiss,
  onError,
}: RazorpayOptions) {
  const isMock = process.env.NEXT_PUBLIC_ENABLE_PAYMENT_MOCK === "true";
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_outreachx2026";

  if (isMock) {
    console.log("💳 [Payment] Running in Mock Payment mode.");
    // Simulate payment processing delay (1.5s) to feel realistic
    setTimeout(() => {
      const mockPaymentId = `pay_mock_${Math.random().toString(36).substring(2, 11)}`;
      onSuccess(mockPaymentId);
    }, 1500);
    return;
  }

  // Ensure amount is an integer
  const finalAmount = Math.round(amount);
  if (isNaN(finalAmount) || finalAmount <= 0) {
    const msg = "Invalid payment amount.";
    console.error(`❌ ${msg}`, finalAmount);
    if (onError) onError(msg);
    return;
  }

  const loaded = await loadRazorpayScript();
  if (!loaded) {
    const errMessage = "Razorpay SDK failed to load. Please check your internet connection or disable any content/ad blockers.";
    console.error(`❌ ${errMessage}`);
    if (onError) {
      onError(errMessage);
    } else {
      alert(`⚠️ ${errMessage}`);
    }
    return;
  }

  try {
    const options = {
      key: keyId,
      amount: finalAmount,
      currency: "INR",
      name: name,
      description: description,
      image: "/favicon.svg",
      handler: function (response: any) {
        if (response && response.razorpay_payment_id) {
          onSuccess(response.razorpay_payment_id);
        } else {
          console.warn("⚠️ Razorpay success handler called but no payment ID found.", response);
          if (onDismiss) onDismiss();
        }
      },
      modal: {
        ondismiss: function () {
          console.log("💳 [Razorpay] Modal dismissed by user.");
          if (onDismiss) onDismiss();
        },
        escape: true,
        backdropclose: false
      },
      prefill: {
        name: prefill?.name || "OutreachX User",
        email: prefill?.email || "user@outreachx.com",
        contact: prefill?.contact || "9999999999",
      },
      theme: {
        color: "#0F172A",
      },
    };

    const rzp = new (window as any).Razorpay(options);
    
    rzp.on('payment.failed', function (response: any) {
      console.error("❌ [Razorpay] Payment failed:", response.error);
      if (onError) onError(response.error.description || "Payment failed");
    });

    rzp.open();
  } catch (error: any) {
    console.error("❌ Failed to open Razorpay checkout:", error);
    const errMessage = error?.message || "Failed to initialize/open Razorpay checkout.";
    if (onError) {
      onError(errMessage);
    } else {
      alert(`❌ ${errMessage}`);
    }
  }
}
