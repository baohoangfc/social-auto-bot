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
      
      // GỌI THỰC THI ĐĂNG BÀI THẬT
      try {
        const platforms = ['x', 'facebook'];
        for (const platform of platforms) {
          await postToSpecificPlatform(platform, content);
        }
      } catch (e: any) {
        console.error("Lỗi đăng bài thực tế:", e);
        return NextResponse.json({ 
          error: 'Lỗi khi đăng bài lên mạng xã hội', 
          detail: e.message 
        }, { status: 500 });
      }

      return NextResponse.json({ success: true, post: newPost });
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
