import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/firebase/admin'
import { GoogleGenerativeAI } from '@google/generative-ai'

type Ctx = { params: Promise<{ campaignId: string }> }

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { campaignId } = await params
    const { channel, description, title, toneOfVoice } = await request.json()

    if (!channel || !['voice', 'call'].includes(channel)) {
      return NextResponse.json(
        { error: 'Channel must be voice or call' },
        { status: 400 }
      )
    }

    const ref = db
      .collection('users')
      .doc(userId)
      .collection('campaigns')
      .doc(campaignId)

    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('Missing GEMINI_API_KEY')
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      )
    }

    console.log(`🎤 Generating ${channel} transcript for campaign:`, campaignId)

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const isVoice = channel === 'voice'

    const prompt = isVoice
      ? `You are an expert outreach specialist creating a WhatsApp voice note.

Using this campaign information:

**Campaign Title:** "${title}"
**Campaign Description:** "${description}"
**Tone:** ${toneOfVoice}

Create a short, ${toneOfVoice} WhatsApp voice note script that will be recorded and sent to the target audience. 

Requirements:
- Start with a warm greeting
- Single paragraph, conversational and natural
- 20-30 seconds when read aloud (approximately 50-75 words)
- Second person perspective ("you", "your team", "your family")
- No Agent/Customer labels or dialogue
- Include a subtle call-to-action
- Sound warm, genuine, and friendly
- Suitable for voice message delivery

Return only the script text, no additional commentary.`
      : `You are an expert outreach specialist creating a phone call script for an automated system.

Using this campaign information:

**Campaign Title:** "${title}"
**Campaign Description:** "${description}"
**Tone:** ${toneOfVoice}

Create a short phone call script that will be spoken by an automated system to the target recipients.

Requirements:
- Start with a warm greeting
- Introduce the purpose of the message clearly
- Start with addressing that it is an ai generated voice call
- One continuous monologue (no back-and-forth dialogue)
- No "Agent:", "Customer:", or any speaker labels
- 20-30 seconds when read aloud (approximately 50-75 words)
- Second person perspective ("you", "your team", "your family")
- ${toneOfVoice} in tone and delivery
- Include a natural call-to-action
- Friendly, concise, and respectful of the recipient's time

Return only the script text, no additional commentary.`

    const result = await model.generateContent(prompt)
    const transcript = result.response.text()

    console.log(`✅ Generated ${channel} transcript`)

    // Save to Firestore channelContent
    const fieldName = channel === 'voice' ? 'channelContent.voice.transcript' : 'channelContent.calls.transcript'
    await ref.set(
      {
        [fieldName]: transcript,
        updatedAt: new Date(),
      },
      { merge: true }
    )

    return NextResponse.json({
      success: true,
      transcript,
      channel,
    })
  } catch (error) {
    console.error('❌ Transcript generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate transcript' },
      { status: 500 }
    )
  }
}