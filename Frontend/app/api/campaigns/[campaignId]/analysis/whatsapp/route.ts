import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase/admin'
import { addWhatsAppConversation, updateWhatsAppUserInteraction } from '@/lib/analysis-ops'

type Context = { params: Promise<{ campaignId: string }> }

/**
 * POST /api/campaigns/[campaignId]/analysis/whatsapp
 * 
 * Updates WhatsApp analytics in the analysis collection
 * Called by backend when WhatsApp messages are processed
 */
export async function POST(
  request: NextRequest,
  { params }: Context
): Promise<NextResponse> {
  try {
    const { campaignId } = await params
    const body = await request.json()

    const { userId, contactId, contactName, phone, messages = [] } = body

    if (!userId || !campaignId || !contactId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Add conversation to analysis
    await addWhatsAppConversation(userId, campaignId, {
      contactId,
      contactName,
      phone,
      messages,
    })

    // Update user interaction count
    await updateWhatsAppUserInteraction(userId, campaignId, {
      contactId,
      contactName,
      phone,
    })

    return NextResponse.json(
      { status: 'success', message: 'WhatsApp analysis updated' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('❌ WhatsApp analysis update error:', error.message)
    return NextResponse.json(
      { error: 'Failed to update whatsapp analysis' },
      { status: 500 }
    )
  }
}
