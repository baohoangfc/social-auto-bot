import { NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/cron-auth';
import { runAutoPilotForPlatform } from '@/lib/workflow/orchestrator';

export const maxDuration = 120;

type RouteParams = { params: Promise<{ platform: string }> };

export async function GET(req: Request, { params }: RouteParams) {
  if (!verifyCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { platform } = await params;
  if (platform !== 'x' && platform !== 'facebook') {
    return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 });
  }

  try {
    await runAutoPilotForPlatform(platform);
    return NextResponse.json({ success: true, platform });
  } catch (error) {
    console.error(`Auto-pilot cron error (${platform}):`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
