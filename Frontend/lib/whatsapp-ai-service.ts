import { generateCampaignReply } from './campaign-langchain';

/**
 * Generate AI response for campaign inbox messages
 */
export async function generateAIResponse(
  userId: string,
  campaignId: string,
  contactId: string,
  userMessage: string
): Promise<string> {
  return generateCampaignReply({ userId, campaignId, contactId, message: userMessage });
}
