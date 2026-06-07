import { NextResponse } from 'next/server';
import { scrapeNews } from '@/lib/news/scraper';
import { generateCaption, generatePostImage } from '@/lib/ai/gemini';

export const maxDuration = 120;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

export async function POST(req: Request) {
  try {
    const { url, withImage = true } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    const news = await scrapeNews(url);
    if (!news || !news.content) {
      return NextResponse.json({
        error: 'Không thể đọc được nội dung tin tức từ link này.',
        detail: 'Nội dung bài báo đang trống hoặc bị chặn.',
      }, { status: 400 });
    }

    const [caption, image] = await Promise.all([
      generateCaption(news.content),
      withImage ? generatePostImage(news.content, news.title) : Promise.resolve(null),
    ]);

    return NextResponse.json({
      caption,
      title: news.title,
      sourceUrl: url,
      imageDataUrl: image?.dataUrl ?? null,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      error: 'Lỗi xử lý tin tức (API Error)',
      detail: getErrorMessage(error),
    }, { status: 500 });
  }
}
