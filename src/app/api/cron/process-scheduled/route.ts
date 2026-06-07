import { NextResponse } from 'next/server';
import { processScheduledPosts } from '@/lib/workflow/orchestrator';

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await processScheduledPosts();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cron API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
