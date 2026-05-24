import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/firebase/admin'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string; contactId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { campaignId, contactId } = await params

    if (!campaignId || !contactId) {
      return NextResponse.json(
        { error: 'Campaign ID and Contact ID are required' },
        { status: 400 }
      )
    }

    console.log(`📖 Marking contact ${contactId} as opened in campaign ${campaignId}`)

    // Mark conversation as opened in the correct nested path
    const conversationRef = db
      .collection('users')
      .doc(userId)
      .collection('campaigns')
      .doc(campaignId)
      .collection('inbox')
      .doc('contacts')
      .collection('contacts')
      .doc(contactId)

    // Use set with merge to create/update the document
    await conversationRef.set({
      isOpened: true,
      openedAt: new Date().toISOString(),
      unread: false,
    }, { merge: true })

    console.log(`✅ Chat marked as opened for contact ${contactId}`)
    return NextResponse.json({
      success: true,
      message: 'Chat marked as opened',
    })
  } catch (error) {
    console.error('❌ Error marking chat as opened:', error)
    // Don't fail the request - just log the error
    return NextResponse.json(
      { success: true, message: 'Chat opened (non-blocking)' },
      { status: 200 }
    )
  }
}
