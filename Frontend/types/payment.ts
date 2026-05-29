export interface PaymentRecord {
  id?: string;
  campaignId: string;
  userId: string;
  launchPaid: boolean;
  makeCallCount: number;
  lastPaymentId: string;
  lastAmount: number;
  paymentType: "launch" | "relaunch" | "call" | "wallet";
  selectedChannels: string[];
  contactsCount: number;
  paidAt?: any;
  createdAt?: any;
  status: "pending" | "paid" | "failed";
}

export interface PricingInfo {
  whatsappCost: number;
  voiceCost: number;
  callsCost: number;
  totalCost: number;
  launchCost?: number;
  relaunchCost?: number;
  contactsCount: number;
  estimatedCallMinutes: number;
  selectedChannels: string[];
}

export interface UserWallet {
  userId: string;
  walletBalance: number;
}
