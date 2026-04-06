import { NextResponse } from 'next/server';
import { fetchRSS } from '@/lib/news/scraper';
import { INTERNATIONAL_SOURCES } from '@/lib/news/sources';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sourceId = searchParams.get('sourceId');

    if (sourceId) {
      const source = INTERNATIONAL_SOURCES.find(s => s.id === sourceId);
      if (!source) return NextResponse.json({ error: 'Source not found' }, { status: 404 });
      
      const items = await fetchRSS(source.url);
      return NextResponse.json({ source, items });
    }

    // Default: Get all sources
    return NextResponse.json({ sources: INTERNATIONAL_SOURCES });
  } catch (error: any) {
    console.error('News List API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
