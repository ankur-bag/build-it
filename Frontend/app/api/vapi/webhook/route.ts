import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';
import { updateCallAnalytics } from '@/lib/analysis-ops';

/**
 * POST /api/vapi/webhook
 * Handlers Vapi.ai webhooks for call lifecycle events.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log('\n🔴🔴🔴 VAPI WEBHOOK RECEIVED 🔴🔴🔴');
    console.log('Event Type:', body.message?.type);
    console.log('Full Payload:', JSON.stringify(body, null, 2));
    console.log('🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴\n');

    const message = body.message;
    if (!message) {
      console.warn('⚠️ Webhook: No message in body');
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    // Handle Call Ended Event
    const eventType = message.type;
    if (eventType === 'call-ended' || eventType === 'call.ended' || eventType === 'end-of-call-report') {
      const call = message.call;
      const metadata = call?.metadata || {};
      const { userId, campaignId } = metadata;

      if (!userId || !campaignId) {
        console.warn('⚠️ Vapi Webhook: Received event without userId/campaignId in metadata');
        console.log('   Received Metadata:', JSON.stringify(metadata, null, 2));
        return NextResponse.json({ status: 'ignored', reason: 'Missing attribution metadata' });
      }

      console.log(`\n📊 ═══════════════════════════════════════════`);
      console.log(`📊 PROCESSING CALL COMPLETION`);
      console.log(`   Call ID: ${call.id}`);
      console.log(`   Campaign: ${campaignId}`);
      console.log(`   User: ${userId}`);
      console.log(`   Phone: ${call.customer?.number}`);
      console.log(`   Duration: ${call.duration}s`);
      console.log(`   Status: ${call.status}`);
      console.log(`📊 ═══════════════════════════════════════════\n`);

      // 1. Save individual call record
      const callData = {
        callId: call.id,
        timestamp: new Date().toISOString(),
        duration: call.duration || 0,
        status: call.status || 'ended',
        endedReason: call.endedReason || 'unknown',
        customerPhone: call.customer?.number || 'unknown',
        transcript: call.transcript || '',
        summary: call.summary || '',
        cost: call.cost || 0,
      };

      await db
        .collection('users')
        .doc(userId)
        .collection('campaigns')
        .doc(campaignId)
        .collection('calls')
        .doc(call.id)
        .set(callData);

      console.log(`✅ Call record saved to Firestore`);

      // Update analysis collection with call data
      // Determine if call was answered based on duration
      const isAnswered = (call.duration || 0) > 0;
      console.log(`\n🔔 CALL RESULT: ${isAnswered ? '✅ ANSWERED (duration > 0)' : '❌ MISSED (duration = 0)'}\n`);

      await updateCallAnalytics(userId, campaignId, {
        duration: call.duration || 0,
        status: isAnswered ? 'completed' : 'failed',
        customerPhone: call.customer?.number || 'unknown',
      });
      console.log(`✅ Analytics data updated\n`);

      // 2. Optional: Increment campaign-level stats for faster lookup
      const campaignRef = db
        .collection('users')
        .doc(userId)
        .collection('campaigns')
        .doc(campaignId);

      await db.runTransaction(async (transaction) => {
        const campaignDoc = await transaction.get(campaignRef);
        if (campaignDoc.exists) {
          const data = campaignDoc.data() || {};
          const stats = data.vapiStats || {
            totalCalls: 0,
            totalDuration: 0,
            answeredCalls: 0,
          };

          stats.totalCalls += 1;
          stats.totalDuration += call.duration || 0;
          if (call.duration > 0) {
            stats.answeredCalls += 1;
          }

          transaction.update(campaignRef, { vapiStats: stats });
        }
      });
      
      console.log(`📈 Campaign stats updated\n`);
    } else {
      console.log(`📌 Ignoring event type: ${eventType}`);
    }

    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    console.error('\n❌ WEBHOOK ERROR ❌');
    console.error('Error Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('❌❌❌❌❌❌❌❌❌\n');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
