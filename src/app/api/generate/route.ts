import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { scrapeNews } from '@/lib/news/scraper';
import { generateCaption, generatePostImage } from '@/lib/ai/gemini';
import { FacebookPage } from '@/models';

export const maxDuration = 120;

type GenerateRequest = {
  url?: string;
  withImage?: boolean;
  pageId?: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

export async function POST(req: Request) {
  try {
    const { url, withImage = true, pageId } = (await req.json()) as GenerateRequest;
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    const page = pageId
      ? await (async () => {
          await connectDB();
          return FacebookPage.findOne({ pageId, isActive: true }).lean();
        })()
      : null;

    const news = await scrapeNews(url);
    if (!news || !news.content) {
      return NextResponse.json({
        error: 'Không thể đọc được nội dung tin tức từ link này.',
        detail: 'Nội dung bài báo đang trống hoặc bị chặn.',
      }, { status: 400 });
    }

    const [caption, image] = await Promise.all([
      generateCaption(news.content, page?.contentProfile ?? null),
      withImage ? generatePostImage(news.content, news.title) : Promise.resolve(null),
    ]);

    return NextResponse.json({
      caption,
      title: news.title,
      sourceUrl: url,
      imageDataUrl: image?.dataUrl ?? null,
      pageId: page?.pageId ?? null,
      pageName: page?.pageName ?? null,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      error: 'Lỗi xử lý tin tức (API Error)',
      detail: getErrorMessage(error),
    }, { status: 500 });
  }
}
