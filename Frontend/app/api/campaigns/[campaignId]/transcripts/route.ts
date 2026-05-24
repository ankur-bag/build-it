import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/firebase/admin'

type Ctx = { params: Promise<{ campaignId: string }> }

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { campaignId } = await params
    const body = await request.json()
    const { voiceTranscript, callTranscript, audioUrls } = body

    console.log('📝 Transcripts endpoint received:', {
      voiceTranscript: voiceTranscript ? voiceTranscript.substring(0, 50) + '...' : 'undefined',
      callTranscript: callTranscript ? callTranscript.substring(0, 50) + '...' : 'undefined',
      audioUrls,
    });

    const ref = db
      .collection('users')
      .doc(userId)
      .collection('campaigns')
      .doc(campaignId)

    // Build update object
    const update: any = { updatedAt: new Date() }

    if (voiceTranscript !== undefined) {
      update['channelContent.voice.transcript'] = voiceTranscript
    }

    if (callTranscript !== undefined) {
      update['channelContent.calls.transcript'] = callTranscript
    }

    if (audioUrls) {
      if (audioUrls.voice !== undefined) {
        update['audioUrls.voice'] = audioUrls.voice
      }
      if (audioUrls.calls !== undefined) {
        update['audioUrls.calls'] = audioUrls.calls
      }
    }

    // Only update if there's something to save
    if (Object.keys(update).length > 1) {
      await ref.set(update, { merge: true })
      console.log('✅ Transcripts and audio URLs saved for campaign:', campaignId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error saving transcripts:', error)
    return NextResponse.json(
      { error: 'Failed to save transcripts' },
      { status: 500 }
    )
  }
}
