import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';

/**
 * GET /api/debug/analytics
 * Debug endpoint to check analytics without auth
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    const campaignId = req.nextUrl.searchParams.get('campaignId');

    if (!userId || !campaignId) {
      return NextResponse.json({
        error: 'Missing userId or campaignId',
        example: '/api/debug/analytics?userId=user_xxx&campaignId=campaign_xxx',
      });
    }

    const analysisRef = db
      .collection('analysis')
      .doc(userId)
      .collection('campaigns')
      .doc(campaignId);

    const doc = await analysisRef.get();

    if (!doc.exists) {
      return NextResponse.json({
        error: 'Analysis document not found',
        path: `analysis/${userId}/campaigns/${campaignId}`,
      });
    }

    const data = doc.data();

    return NextResponse.json({
      status: 'found',
      path: `analysis/${userId}/campaigns/${campaignId}`,
      data: {
        calls: {
          total: data?.calls?.total || 0,
          answered: data?.calls?.answered || 0,
          missed: data?.calls?.missed || 0,
        },
        initiated: data?.initiated || [],
        answered: data?.answered || [],
        missed: data?.missed || [],
        updatedAt: data?.updatedAt?.toISOString?.() || data?.updatedAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
