import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/firebase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { campaignId } = await req.json()

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      )
    }

    // Get campaign details
    const campaignDoc = await db
      .collection('users')
      .doc(userId)
      .collection('campaigns')
      .doc(campaignId)
      .get()

    if (!campaignDoc.exists) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    const campaignData = campaignDoc.data()

    // Get all contacts for this campaign
    const contactsSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('campaigns')
      .doc(campaignId)
      .collection('contacts')
      .get()

    // Send AI message to all contacts
    const messageContent = campaignData?.aiGeneratedDescription || campaignData?.description || ''
    
    for (const contactDoc of contactsSnapshot.docs) {
      const contactData = contactDoc.data()
      
      // Check if AI message already sent
      const existingMessages = await db
        .collection('users')
        .doc(userId)
        .collection('campaigns')
        .doc(campaignId)
        .collection('conversations')
        .doc(contactDoc.id)
        .collection('messages')
        .where('sender', '==', 'ai')
        .get()

      if (existingMessages.empty) {
        // Send initial AI message
        await db
          .collection('users')
          .doc(userId)
          .collection('campaigns')
          .doc(campaignId)
          .collection('conversations')
          .doc(contactDoc.id)
          .collection('messages')
          .add({
            sender: 'ai',
            type: 'text',
            content: `${campaignData?.title}\n\n${messageContent}`,
            timestamp: new Date(),
            createdAt: new Date(),
          })

        // Send audio message if available
        if (campaignData?.audioUrls?.voice) {
          await db
            .collection('users')
            .doc(userId)
            .collection('campaigns')
            .doc(campaignId)
            .collection('conversations')
            .doc(contactDoc.id)
            .collection('messages')
            .add({
              sender: 'ai',
              type: 'audio',
              content: 'Voice message',
              audioUrl: campaignData.audioUrls.voice,
              timestamp: new Date(),
              createdAt: new Date(),
            })
        }

        // Send assets if available
        if (campaignData?.assets && campaignData.assets.length > 0) {
          await db
            .collection('users')
            .doc(userId)
            .collection('campaigns')
            .doc(campaignId)
            .collection('conversations')
            .doc(contactDoc.id)
            .collection('messages')
            .add({
              sender: 'ai',
              type: 'text',
              content: `Attached: ${campaignData.assets.length} file(s)`,
              assets: campaignData.assets,
              timestamp: new Date(),
              createdAt: new Date(),
            })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `AI messages sent to ${contactsSnapshot.size} contacts`,
    })
  } catch (error) {
    console.error('Error sending campaign messages:', error)
    return NextResponse.json(
      { error: 'Failed to send campaign messages' },
      { status: 500 }
    )
  }
}
