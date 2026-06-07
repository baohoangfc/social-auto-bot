import { NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/cron-auth';
import { runNewsAggregator } from '@/lib/workflow/orchestrator';

export const maxDuration = 60;

export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runNewsAggregator();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Aggregator cron error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
