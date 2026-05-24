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

    const ref = db
      .collection('users')
      .doc(userId)
      .collection('campaigns')
      .doc(campaignId)

    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const data = snap.data() || {}
    let description = data.description || ''
    let originalDescription = ''

    // Handle both old (string) and new (object with original/aiEnhanced) formats
    if (typeof description === 'object' && description !== null) {
      originalDescription = description.original || ''
      description = originalDescription || description.aiEnhanced || ''
    } else if (typeof description === 'string') {
      originalDescription = description
    }

    const title = data.title || ''
    const toneOfVoice = data.toneOfVoice || 'professional'
    const wordLimit = data.wordLimit || 160

    if (!description) {
      return NextResponse.json(
        { error: 'Campaign must have a description to enhance' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('Missing GEMINI_API_KEY')
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      )
    }

    console.log('🤖 Generating AI description for campaign:', campaignId)

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel(
      { model: process.env.GEMINI_MODEL || 'gemini-3-flash-preview' },
      { apiVersion: 'v1beta' }
    )

    const prompt = `You are an expert marketing copywriter specializing in WhatsApp outreach campaigns.

Your task: Enhance and refine this campaign description to be more compelling and engaging.

**Campaign Title:**
"${title}"

**Original Description:**
"${description}"

**Requirements:**
- Tone: ${toneOfVoice}
- Max word limit: ${wordLimit} words
- Make it more persuasive and action-oriented
- Keep the core message but make it more impactful
- Suitable for WhatsApp marketing
- Return ONLY the enhanced description, no markdown, no extra formatting`

    const result = await model.generateContent(prompt)
    const aiDescription = result.response.text().trim()

    console.log('✅ AI description generated, saving to Firestore...')

    await ref.set(
      {
        description: {
          original: originalDescription,
          aiEnhanced: aiDescription,
        },
        aiDescription,
        previewText: aiDescription,
        updatedAt: new Date(),
      },
      { merge: true }
    )

    console.log('💾 Saved to Firestore')

    return NextResponse.json({ success: true, aiDescription, previewText: aiDescription })
  } catch (error) {
    console.error('❌ Description AI error:', error)
    return NextResponse.json(
      { error: 'Failed to generate description' },
      { status: 500 }
    )
  }
}
