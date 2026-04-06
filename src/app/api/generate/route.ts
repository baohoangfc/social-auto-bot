import { NextResponse } from 'next/server';
import { scrapeNews } from '@/lib/news/scraper';
import { generateCaption } from '@/lib/ai/gemini';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    const news = await scrapeNews(url);
    if (!news) return NextResponse.json({ error: 'Could not scrape news' }, { status: 404 });

    const caption = await generateCaption(news.content);

    return NextResponse.json({ caption, title: news.title });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
