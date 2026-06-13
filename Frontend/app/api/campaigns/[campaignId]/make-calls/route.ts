import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/firebase/admin';
import { callAgent } from '@/lib/call-agent';
import { getPublicAppUrl } from '@/lib/app-url';

type Context = { params: Promise<{ campaignId: string }> };

/** Vercel must finish placing calls before the function exits */
export const maxDuration = 60;

/**
 * POST /api/campaigns/[campaignId]/make-calls
 *
 * Initiates AI-powered outbound calls to all contacts in the campaign.
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
    console.log('Deployment URL:', getPublicAppUrl());

    const callsEnabled = campaignData.channels?.calls?.enabled;
    if (!callsEnabled) {
      console.log('❌ Calls channel is disabled');
      return NextResponse.json(
        { error: 'Calls channel is not enabled for this campaign' },
        { status: 400 }
      );
    }

    const contacts = campaignData.contacts || campaignData.contactsSummary?.items || [];

    if (contacts.length === 0) {
      return NextResponse.json({ error: 'No contacts found to call' }, { status: 400 });
    }

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
        calls: { total: 0, answered: 0, missed: 0 },
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

    const baseUrl = getPublicAppUrl();

    // Await on Vercel — fire-and-forget gets killed when the function returns
    const callResult = await callAgent({ phoneNumbers, campaignId, userId, baseUrl });

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

    console.log(
      `✅ Campaign ${campaignId} calls complete — ${callResult.successfulCalls}/${callResult.totalCalls} succeeded`,
    );

    if (callResult.failedCalls > 0) {
      return NextResponse.json({
        success: false,
        campaignId,
        message: `Only ${callResult.successfulCalls}/${callResult.totalCalls} call(s) connected.`,
        totalContacts: phoneNumbers.length,
        callResults: callResult,
      });
    }

    return NextResponse.json({
      success: true,
      campaignId,
      message: `AI calling agent completed for ${phoneNumbers.length} contact(s).`,
      totalContacts: phoneNumbers.length,
      callResults: callResult,
    });
  } catch (error) {
    console.error('Make-calls route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
