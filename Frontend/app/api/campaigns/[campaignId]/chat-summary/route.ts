import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/firebase/admin'
import { GoogleGenerativeAI } from '@google/generative-ai'

type QAPair = {
  question: string
  answer: string
  contactId?: string
  contactName?: string
  phone?: string
}

type ChatSummaryResponse = {
  overallSummary: string
  overallSentiment: 'positive' | 'negative' | 'mixed' | 'neutral'
  commonQuestions: Array<{
    type: string
    count: number
    examples: string[]
  }>
  unansweredQuestions: Array<{
    question: string
    reason: string
  }>
}

function parseJsonFromText(text: string) {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0])
  } catch {
    return null
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { campaignId } = await params
    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 })
    }

    const analysisRef = db
      .collection('analysis')
      .doc(userId)
      .collection('campaigns')
      .doc(campaignId)

    const analysisDoc = await analysisRef.get()
    if (!analysisDoc.exists) {
      return NextResponse.json({
        overallSummary: 'No conversations yet.',
        overallSentiment: 'neutral',
        commonQuestions: [],
        unansweredQuestions: [],
      } satisfies ChatSummaryResponse)
    }

    const analysisData = analysisDoc.data() || {}
    const conversations = analysisData?.whatsapp?.conversations || {}

    const qaPairs: QAPair[] = []

    Object.values(conversations).forEach((conv: any) => {
      const messages = Array.isArray(conv.messages) ? conv.messages : []
      const sorted = [...messages].sort((a: any, b: any) => {
        const ta = new Date(a.timestamp || a.createdAt || 0).getTime()
        const tb = new Date(b.timestamp || b.createdAt || 0).getTime()
        return ta - tb
      })

      let pendingQuestion: string | null = null

      sorted.forEach((msg: any) => {
        const sender = (msg.sender || '').toLowerCase()
        const content = String(msg.content || '').trim()
        if (!content) return

        if (sender === 'user') {
          if (pendingQuestion) {
            qaPairs.push({
              question: pendingQuestion,
              answer: '',
              contactId: conv.contactId,
              contactName: conv.contactName,
              phone: conv.phone,
            })
          }
          pendingQuestion = content
          return
        }

        if (pendingQuestion) {
          qaPairs.push({
            question: pendingQuestion,
            answer: content,
            contactId: conv.contactId,
            contactName: conv.contactName,
            phone: conv.phone,
          })
          pendingQuestion = null
        }
      })

      if (pendingQuestion) {
        qaPairs.push({
          question: pendingQuestion,
          answer: '',
          contactId: conv.contactId,
          contactName: conv.contactName,
          phone: conv.phone,
        })
      }
    })

    if (qaPairs.length === 0) {
      return NextResponse.json({
        overallSummary: 'No user questions found yet.',
        overallSentiment: 'neutral',
        commonQuestions: [],
        unansweredQuestions: [],
      } satisfies ChatSummaryResponse)
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })

    const prompt = `You are an analyst for an event organizer. Analyze the full set of user questions and AI replies from a WhatsApp outreach campaign.

Your tasks:
1) Write an overall summary of what users think about the event (positive, negative, mixed, or neutral sentiment) and why.
2) Identify common question TYPES (not exact wording). Group similar intents together.
3) Find questions the AI did NOT answer or answered poorly. Only include if the question is reasonable and relevant to the event context. Skip nonsense or abusive questions.

Return ONLY valid JSON in this exact shape:
{
  "overallSummary": "...",
  "overallSentiment": "positive|negative|mixed|neutral",
  "commonQuestions": [
    { "type": "...", "count": 0, "examples": ["...", "..."] }
  ],
  "unansweredQuestions": [
    { "question": "...", "reason": "..." }
  ]
}

Here are the question/answer pairs (all conversations):
${JSON.stringify(qaPairs, null, 2)}
`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    const parsed = parseJsonFromText(text)

    if (!parsed) {
      return NextResponse.json({
        overallSummary: 'Failed to parse summary.',
        overallSentiment: 'neutral',
        commonQuestions: [],
        unansweredQuestions: [],
      } satisfies ChatSummaryResponse)
    }

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('❌ Chat summary error:', error)
    return NextResponse.json(
      { error: 'Failed to generate chat summary' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { campaignId } = await params
    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 })
    }

    const body = await req.json()
    const question = String(body?.question || '').trim()
    const answer = String(body?.answer || '').trim()

    if (!question || !answer) {
      return NextResponse.json(
        { error: 'Question and answer are required' },
        { status: 400 }
      )
    }

    const entry = `Q: ${question}\nA: ${answer}`
    const uploadedAt = new Date().toISOString()

    const upsertOrganizerNotes = (documents: any[]) => {
      const docs = Array.isArray(documents) ? [...documents] : []
      const targetIndex = docs.findIndex(
        (doc: any) =>
          doc?.name === 'Organizer Answers' ||
          doc?.cloudinary_public_id === 'organizer-answers'
      )

      if (targetIndex >= 0) {
        const existing = docs[targetIndex]
        const existingText = String(existing?.extractedText || '').trim()
        const combinedText = existingText ? `${existingText}\n\n${entry}` : entry
        docs[targetIndex] = {
          ...existing,
          name: existing?.name || 'Organizer Answers',
          extractedText: combinedText,
          file_type: existing?.file_type || 'text/plain',
          cloudinary_url: existing?.cloudinary_url || '',
          cloudinary_public_id: existing?.cloudinary_public_id || 'organizer-answers',
          uploadedAt,
        }
      } else {
        docs.push({
          name: 'Organizer Answers',
          extractedText: entry,
          file_type: 'text/plain',
          cloudinary_url: '',
          cloudinary_public_id: 'organizer-answers',
          uploadedAt,
        })
      }

      return docs
    }

    const updateCampaignDocs = async (ref: FirebaseFirestore.DocumentReference) => {
      const snap = await ref.get()
      if (!snap.exists) return false
      const data = snap.data() || {}
      const updatedDocs = upsertOrganizerNotes(data.documents || [])
      await ref.update({
        documents: updatedDocs,
        updatedAt: new Date().toISOString(),
      })
      return true
    }

    const userCampaignRef = db
      .collection('users')
      .doc(userId)
      .collection('campaigns')
      .doc(campaignId)

    const rootCampaignRef = db.collection('campaigns').doc(campaignId)

    const userUpdated = await updateCampaignDocs(userCampaignRef)
    const rootUpdated = await updateCampaignDocs(rootCampaignRef)

    if (!userUpdated && !rootUpdated) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Organizer answer error:', error)
    return NextResponse.json(
      { error: 'Failed to save organizer answer' },
      { status: 500 }
    )
  }
}
