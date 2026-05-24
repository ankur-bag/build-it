import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/firebase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { campaignId, contactId, message } = await req.json()

    if (!campaignId || !contactId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const messagesRef = db
      .collection('users')
      .doc(userId)
      .collection('campaigns')
      .doc(campaignId)
      .collection('conversations')
      .doc(contactId)
      .collection('messages')

    // Add message to Firebase
    const docRef = await messagesRef.add({
      sender: message.sender,
      type: message.type || 'text',
      content: message.content,
      audioUrl: message.audioUrl,
      assets: message.assets,
      timestamp: new Date(),
      createdAt: new Date(),
    })

    return NextResponse.json({
      id: docRef.id,
      ...message,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error('Error saving message:', error)
    return NextResponse.json(
      { error: 'Failed to save message' },
      { status: 500 }
    )
  }
}
