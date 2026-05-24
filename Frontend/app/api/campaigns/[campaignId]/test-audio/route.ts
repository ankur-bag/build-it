import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/firebase/admin'

type Ctx = { params: Promise<{ campaignId: string }> }

/**
 * GET /api/campaigns/[campaignId]/test-audio
 * 
 * Test endpoint to verify audio was generated and saved correctly.
 * Returns the audioUrl and attempts to verify it's accessible.
 */
export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { campaignId } = await params
    const ref = db
      .collection('users')
      .doc(userId)
      .collection('campaigns')
      .doc(campaignId)

    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const campaignData = snap.data() as any

    const audioUrl = campaignData.audioUrls?.voice
    const audioPublicId = campaignData.audioPublicIds?.voice

    console.log(`🔊 Audio Test for campaign: ${campaignId}`)
    console.log(`   Audio URL: ${audioUrl || '❌ MISSING'}`)
    console.log(`   Public ID: ${audioPublicId || 'N/A'}`)

    if (!audioUrl) {
      return NextResponse.json({
        success: false,
        message: 'No audio URL found for this campaign',
        campaignId,
        audioUrl: null,
        hasAudio: false,
      })
    }

    // Try to verify the audio URL is accessible
    try {
      const audioTest = await fetch(audioUrl, { method: 'HEAD' })
      const contentType = audioTest.headers.get('content-type')
      const contentLength = audioTest.headers.get('content-length')

      return NextResponse.json({
        success: true,
        campaignId,
        audioUrl,
        audioPublicId,
        hasAudio: true,
        accessible: audioTest.ok,
        statusCode: audioTest.status,
        contentType: contentType || 'unknown',
        contentLength: contentLength || 'unknown',
        ready_to_send: audioTest.ok && audioUrl.length > 10,
      })
    } catch (err) {
      return NextResponse.json({
        success: true,
        campaignId,
        audioUrl,
        audioPublicId,
        hasAudio: true,
        accessible: false,
        error: (err as Error).message,
        ready_to_send: false,
      })
    }
  } catch (error) {
    console.error('Audio test error:', error)
    return NextResponse.json(
      { error: 'Failed to test audio' },
      { status: 500 }
    )
  }
}
