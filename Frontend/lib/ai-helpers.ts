/**
 * AI Description Generation Helper
 */

export interface AIDescriptionRequest {
  campaignId: string
  wordLimit?: number
  tone?: string
  emotion?: string
}

export interface AIDescriptionResponse {
  success: boolean
  aiDescription?: string
  error?: string
}

/**
 * Generate an AI-refined description for a campaign
 */
export async function generateAIDescription(
  params: AIDescriptionRequest
): Promise<AIDescriptionResponse> {
  try {
    const { campaignId, wordLimit, tone, emotion } = params

    console.log('🤖 Requesting AI description for campaign:', campaignId)

    const response = await fetch(`/api/campaigns/${campaignId}/description`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wordLimit: wordLimit || 200,
        tone: tone || 'professional and friendly',
        emotion: emotion || 'trust and excitement',
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: error.error || 'Failed to generate description',
      }
    }

    const data = await response.json()
    console.log('✅ AI description generated successfully')

    return {
      success: true,
      aiDescription: data.aiDescription,
    }
  } catch (err) {
    console.error('❌ Error generating description:', err)
    return {
      success: false,
      error: 'Failed to generate description',
    }
  }
}
