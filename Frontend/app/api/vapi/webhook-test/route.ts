import { NextRequest, NextResponse } from 'next/server';
import { updateCallAnalytics } from '@/lib/analysis-ops';

/**
 * POST /api/vapi/webhook-test
 * Manual test endpoint to simulate webhook call completion
 * Usage: POST with body:
 * {
 *   "userId": "user_xxx",
 *   "campaignId": "campaignId_xxx", 
 *   "phone": "+919883479073",
 *   "duration": 45,
 *   "answered": true
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, campaignId, phone, duration = 45, answered = true } = body;

    if (!userId || !campaignId || !phone) {
      return NextResponse.json(
        { error: 'Missing userId, campaignId, or phone' },
        { status: 400 }
      );
    }

    console.log('🧪 WEBHOOK TEST: Simulating call completion');
    console.log(`   User: ${userId}`);
    console.log(`   Campaign: ${campaignId}`);
    console.log(`   Phone: ${phone}`);
    console.log(`   Duration: ${duration}s`);
    console.log(`   Answered: ${answered}`);

    // Simulate webhook call
    await updateCallAnalytics(userId, campaignId, {
      duration: duration,
      status: answered ? 'completed' : 'failed',
      customerPhone: phone,
    });

    console.log('✅ Test webhook processed successfully');

    return NextResponse.json({
      status: 'success',
      message: 'Call analytics updated in test mode',
      data: {
        userId,
        campaignId,
        phone,
        duration,
        status: answered ? 'answered' : 'missed',
      },
    });
  } catch (error: any) {
    console.error('❌ Webhook Test Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
