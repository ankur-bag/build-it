import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { AccessToken } from 'livekit-server-sdk';

/**
 * GET /api/voice/token?room=<roomName>&identity=<participantName>
 * Issues a LiveKit access token for the AI agent or a test client.
 */
async function generateLiveKitToken(room: string, identity: string, canPublish: boolean, canPublishData: boolean): Promise<string> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('Missing LiveKit credentials in environment variables');
  }

  const at = new AccessToken(apiKey, apiSecret);
  at.addGrant({
    room,
    roomJoin: true,
    canPublish,
    canPublishData,
    canSubscribe: true,
  });
  at.identity = identity;

  return await at.toJwt();
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const room = searchParams.get('room');
    const identity = searchParams.get('identity') || 'agent';

    if (!room) {
      return NextResponse.json({ error: 'Missing room parameter' }, { status: 400 });
    }

    const token = await generateLiveKitToken(room, identity, true, true);

    return NextResponse.json({
      token,
      url: process.env.LIVEKIT_URL,
      room,
      identity,
    });
  } catch (error) {
    console.error('Token generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate token' },
      { status: 500 }
    );
  }
}
