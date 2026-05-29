import { CHANNEL_PRICING } from "./constants";
import { PricingInfo } from "@/types/payment";

export function calculateCampaignCost(
  channels: any,
  contactsCount: number
): PricingInfo {
  let isWhatsapp = false;
  let isVoice = false;
  let isCalls = false;

  const selectedChannelsList: string[] = [];

  if (Array.isArray(channels)) {
    isWhatsapp = channels.includes("text") || channels.includes("whatsapp");
    isVoice = channels.includes("voice");
    isCalls = channels.includes("calls") || channels.includes("call");
  } else if (channels && typeof channels === "object") {
    isWhatsapp = !!(channels.text?.enabled || channels.whatsapp?.enabled);
    isVoice = !!channels.voice?.enabled;
    isCalls = !!channels.calls?.enabled;
  }

  if (isWhatsapp) selectedChannelsList.push("WhatsApp");
  if (isVoice) selectedChannelsList.push("Voice");
  if (isCalls) selectedChannelsList.push("AI Call");

  // WhatsApp: ₹1/contact
  const whatsappCost = isWhatsapp ? contactsCount * CHANNEL_PRICING.WHATSAPP : 0;

  // Voice: ₹0.50/contact
  const voiceCost = isVoice ? contactsCount * CHANNEL_PRICING.VOICE : 0;

  // AI Call: ₹4/contact (Prompt says "Charge ONLY for calls... contacts × ₹4")
  const callsCost = isCalls ? contactsCount * CHANNEL_PRICING.AI_CALL : 0;

  // Launch cost now includes WhatsApp + Voice + AI Call (First execution)
  const launchCost = whatsappCost + voiceCost + callsCost;
  const relaunchCost = whatsappCost + voiceCost;

  // totalCost here is for display of "initial setup"
  const totalCost = launchCost;

  return {
    whatsappCost,
    voiceCost,
    callsCost,
    totalCost,
    launchCost,
    relaunchCost,
    contactsCount,
    estimatedCallMinutes: contactsCount, // 1 min per contact as estimate
    selectedChannels: selectedChannelsList,
  };
}
