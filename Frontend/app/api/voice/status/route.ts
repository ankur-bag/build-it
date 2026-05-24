import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/voice/status
 * Twilio status callback — logs call events.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid');
    const callStatus = formData.get('CallStatus');
    const from = formData.get('From');
    const to = formData.get('To');
    const duration = formData.get('CallDuration');

    console.log(`📞 Call status update:`);
    console.log(`   SID:      ${callSid}`);
    console.log(`   Status:   ${callStatus}`);
    console.log(`   From:     ${from} → To: ${to}`);
    console.log(`   Duration: ${duration || 'N/A'}s`);

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Voice status webhook error:', error);
    return new NextResponse('OK', { status: 200 }); // Always return 200 to Twilio
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Voice status webhook active' });
}
