import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/firebase/admin';
import { callAgent } from '@/lib/call-agent';

type Context = { params: Promise<{ campaignId: string }> };

/**
 * POST /api/campaigns/[campaignId]/make-calls
 *
 * Initiates AI-powered outbound calls to all contacts in the campaign.
 * Each call:
 *  1. Creates a call record in analysis collection
 *  2. Initiates call via Vapi
 *  3. Webhook updates call record when it ends
 */
export async function POST(
  request: NextRequest,
  { params }: Context
): Promise<NextResponse> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { campaignId } = await params;

    if (!campaignId) {
      return NextResponse.json({ error: 'Missing campaignId' }, { status: 400 });
    }

    const ref = db
      .collection('users')
      .doc(userId)
      .collection('campaigns')
      .doc(campaignId);

    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const campaignData = snap.data() as any;

    console.log('====== MAKE CALLS (AI AGENT) DEBUG START ======');
    console.log('Campaign ID:', campaignId);

    // Check if calls channel is enabled
    const callsEnabled = campaignData.channels?.calls?.enabled;
    if (!callsEnabled) {
      console.log('❌ Calls channel is disabled');
      return NextResponse.json(
        { error: 'Calls channel is not enabled for this campaign' },
        { status: 400 }
      );
    }

    // Get contacts from campaign data
    const contacts = campaignData.contacts || campaignData.contactsSummary?.items || [];

    if (contacts.length === 0) {
      return NextResponse.json({ error: 'No contacts found to call' }, { status: 400 });
    }

    // Extract phone numbers
    const phoneNumbers: string[] = contacts
      .map((c: any) => c.phone)
      .filter((p: any): p is string => !!p && typeof p === 'string' && p.trim().length > 0);

    if (phoneNumbers.length === 0) {
      return NextResponse.json(
        { error: 'No valid phone numbers found in contacts' },
        { status: 400 }
      );
    }

    console.log(`📞 Launching AI agent calls for campaign ${campaignId}`);
    console.log(`   Contacts: ${contacts.length}, Valid phones: ${phoneNumbers.length}`);
    console.log('====== MAKE CALLS DEBUG END ======');

    // Initialize analysis collection IMMEDIATELY (sync, before any async calls)
    const analysisRef = db
      .collection('analysis')
      .doc(userId)
      .collection('campaigns')
      .doc(campaignId);

    const analysisSnap = await analysisRef.get();
    if (!analysisSnap.exists) {
      console.log(`📊 Initializing analysis collection for campaign ${campaignId}`);
      await analysisRef.set({
        campaignId,
        campaignTitle: campaignData.title || 'Campaign',
        createdAt: new Date(),
        updatedAt: new Date(),
        calls: {
          total: 0,
          answered: 0,
          missed: 0,
        },
        answered: [],
        missed: [],
        initiated: [],
        whatsapp: {
          conversations: {},
          users: {},
          totalMessages: 0,
          totalUsers: 0,
        },
      });
    }

    // Determine the public base URL for webhooks
    const baseUrl =
      process.env.VOICE_BASE_URL ||
      process.env.NEXTAUTH_URL ||
      'http://localhost:3000';

    // Kick off calls (non-blocking — respond immediately for large contact lists)
    callAgent({ phoneNumbers, campaignId, userId, baseUrl })
      .then(async (callResult) => {
        // Update campaign with call results
        await ref.update({
          callsInitiated: true,
          callsInitiatedAt: new Date(),
          callResults: {
            totalAttempted: callResult.totalCalls,
            successfulCalls: callResult.successfulCalls,
            failedCalls: callResult.failedCalls,
            errors: callResult.errors,
          },
        });
        console.log(`✅ Campaign ${campaignId} calls complete — ${callResult.successfulCalls}/${callResult.totalCalls} succeeded`);
      })
      .catch((err) => {
        console.error(`❌ callAgent failed for campaign ${campaignId}:`, err.message);
      });

    return NextResponse.json({
      success: true,
      campaignId,
      message: `AI calling agent initiated for ${phoneNumbers.length} contact(s). Calls are being placed now.`,
      totalContacts: phoneNumbers.length,
    });
  } catch (error) {
    console.error('Make-calls route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
