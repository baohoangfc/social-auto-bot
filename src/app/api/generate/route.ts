import { NextResponse } from 'next/server';
import { scrapeNews } from '@/lib/news/scraper';
import { generateCaption } from '@/lib/ai/gemini';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    const news = await scrapeNews(url);
    if (!news || !news.content) {
      return NextResponse.json({ 
        error: 'Không thể đọc được nội dung tin tức từ link này.', 
        detail: 'Nội dung bài báo đang trống hoặc bị chặn.' 
      }, { status: 400 });
    }

    const caption = await generateCaption(news.content);

    return NextResponse.json({ caption, title: news.title });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: 'Lỗi xử lý tin tức (API Error)', 
      detail: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}
