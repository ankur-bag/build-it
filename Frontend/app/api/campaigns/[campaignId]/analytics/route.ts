import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase/admin'
import { auth } from '@clerk/nextjs/server'

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
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      )
    }

    console.log(`📊 Fetching analytics from ANALYSIS collection for campaign: ${campaignId}, userId: ${userId}`)

    const db_ref = db

    // Fetch analytics data from analysis collection ONLY
    const analysisDocRef = db_ref
      .collection('analysis')
      .doc(userId)
      .collection('campaigns')
      .doc(campaignId)

    const analysisDoc = await analysisDocRef.get()

    const callsSnap = await db_ref
      .collection('users')
      .doc(userId)
      .collection('campaigns')
      .doc(campaignId)
      .collection('calls')
      .get()

    const callDocs = callsSnap.docs.map((doc) => ({
      callId: doc.id,
      ...doc.data(),
    }))

    const callLogMap = new Map<string, any>()
    callDocs.forEach((call: any) => {
      const phone = String(call.customerPhone || 'unknown')
      const sanitized = phone.replace(/\D/g, '') || 'unknown'
      const contactId = `phone_${sanitized}`
      const timestamp = call.timestamp || call.createdAt || ''

      if (!callLogMap.has(contactId)) {
        callLogMap.set(contactId, {
          contactId,
          contactName: call.contactName || 'Unknown',
          phone,
          totalCalls: 0,
          lastCallAt: timestamp,
          calls: [],
        })
      }

      const entry = callLogMap.get(contactId)
      entry.calls.push(call)
      entry.totalCalls += 1
      if (!entry.lastCallAt || new Date(timestamp).getTime() > new Date(entry.lastCallAt).getTime()) {
        entry.lastCallAt = timestamp
      }
    })

    const callLogs = Array.from(callLogMap.values()).sort((a, b) => {
      const timeA = new Date(a.lastCallAt || 0).getTime()
      const timeB = new Date(b.lastCallAt || 0).getTime()
      return timeB - timeA
    })

    if (!analysisDoc.exists) {
      console.log(`📭 Analysis collection empty for campaign ${campaignId} - no data yet`)
      return NextResponse.json({
        callsTotal: 0,
        callsAnswered: 0,
        callsMissed: 0,
        whatsappMessagesSent: 0,
        whatsappInteractedUsers: 0,
        totalContacts: 0,
        whatsappConversations: [],
        answeredContacts: [],
        missedContacts: [],
        callLogs,
      }, { status: 200 })
    }

    const analysisData = analysisDoc.data()
    console.log('✅ Analysis data found:', analysisData)

    // Extract call metrics
    const callsTotal = analysisData?.calls?.total || 0
    const callsAnswered = analysisData?.calls?.answered || 0
    const callsMissed = analysisData?.calls?.missed || 0

    // Extract answered and missed contact lists (NEW)
    const answeredContacts = analysisData?.answered || []
    const missedContacts = analysisData?.missed || []

    // Extract WhatsApp metrics
    const whatsappData = analysisData?.whatsapp || {}
    const whatsappMessagesSent = whatsappData?.totalMessages || 0
    const whatsappInteractedUsers = whatsappData?.totalUsers || 0

    // Fetch total contacts from inbox/contacts document
    const inboxContactsDoc = await db_ref
      .collection('users')
      .doc(userId)
      .collection('campaigns')
      .doc(campaignId)
      .collection('inbox')
      .doc('contacts')
      .get()
    const totalContacts = inboxContactsDoc.exists ? (inboxContactsDoc.data()?.totalContacts || 0) : 0

    // Extract conversations and users
    let conversations: any[] = []

    if (whatsappData?.conversations && typeof whatsappData.conversations === 'object') {
      conversations = Object.entries(whatsappData.conversations).map(([contactId, data]: any) => ({
        contactId,
        contactName: data.contactName || 'Unknown',
        phone: data.phone || 'N/A',
        messagesSent: data.messagesSent || 0,
        messagesReceived: data.messagesReceived || 0,
        messages: data.messages || []
      }))
    }

    console.log(`📊 Analytics Summary from ANALYSIS collection:`)
    console.log(`   Total Calls: ${callsTotal}`)
    console.log(`   Answered: ${callsAnswered}`)
    console.log(`   Missed: ${callsMissed}`)
    console.log(`   WhatsApp Messages: ${whatsappMessagesSent}`)
    console.log(`   WhatsApp Users: ${whatsappInteractedUsers}`)
    return NextResponse.json({
      // Call metrics from analysis collection
      callsTotal,
      callsAnswered,
      callsMissed,
      answeredContacts,
      missedContacts,
      callLogs,
      
      // WhatsApp metrics from analysis collection
      whatsappMessagesSent,
      whatsappInteractedUsers,
      totalContacts,
      whatsappConversations: conversations,
      
      // Status from analysis collection
      analysisStatus: analysisData?.status || 'initialized',
      createdAt: analysisData?.createdAt,
      updatedAt: analysisData?.updatedAt
    })
  } catch (error) {
    console.error('❌ Analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: (error as any).message },
      { status: 500 }
    )
  }
}

// Note: POST route for triggering analysis is handled in a separate API route (e.g., /api/campaigns/[campaignId]/analytics/trigger) to keep concerns separated and avoid unintended side effects on GET requests.