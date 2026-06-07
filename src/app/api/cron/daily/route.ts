import { NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/cron-auth';
import {
  runNewsAggregator,
  runAutoPilotForPlatform,
  processScheduledPosts,
} from '@/lib/workflow/orchestrator';

export const maxDuration = 300;

export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const aggregator = await runNewsAggregator();
    await runAutoPilotForPlatform('x');
    await runAutoPilotForPlatform('facebook');
    await processScheduledPosts();

    return NextResponse.json({
      success: true,
      aggregator,
    });
  } catch (error) {
    console.error('Daily cron error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
