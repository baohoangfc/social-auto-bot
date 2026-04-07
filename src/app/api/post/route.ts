import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Post } from '@/models';
import { processNewsAndPost, postToSpecificPlatform } from '@/lib/workflow/orchestrator';

export async function POST(req: Request) {
  try {
    await connectDB();
    const { content, scheduledFor, status } = await req.json();

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Nếu là đăng ngay lập tức
    if (!scheduledFor || status === 'posted') {
      const newPost = await Post.create({
        content,
        status: 'posted',
        platforms: ['x', 'facebook'] 
      });
      
      // GỌI THỰC THI ĐĂNG BÀI THẬT (Tách biệt từng nền tảng)
      const platforms = ['x', 'facebook'];
      const results = [];
      
      for (const platform of platforms) {
        try {
          await postToSpecificPlatform(platform, content);
          results.push({ platform, status: 'success' });
        } catch (e: any) {
          console.error(`Lỗi đăng ${platform}:`, e.message);
          results.push({ platform, status: 'failed', error: e.message });
        }
      }

      // Kiểm tra nếu tất cả đều thất bại thì mới trả về lỗi 500
      const anySuccess = results.some(r => r.status === 'success');
      if (!anySuccess) {
        return NextResponse.json({ 
          error: 'Tất cả các nền tảng đều thất bại', 
          details: results 
        }, { status: 500 });
      }

      return NextResponse.json({ success: true, post: newPost, results });
    }

    // Nếu là hẹn giờ
    const scheduledPost = await Post.create({
      content,
      scheduledFor: new Date(scheduledFor),
      status: 'scheduled',
      platforms: ['x', 'facebook']
    });

    return NextResponse.json({ success: true, post: scheduledPost });
  } catch (error) {
    console.error('Post API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
