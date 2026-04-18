import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Post } from '@/models';
import { postToSpecificPlatform } from '@/lib/workflow/orchestrator';

type SupportedPlatform = 'x' | 'facebook';

type PlatformPostResult =
  | { platform: SupportedPlatform; status: 'success' }
  | { platform: SupportedPlatform; status: 'failed'; error: string };

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function isFailedResult(result: PlatformPostResult): result is Extract<PlatformPostResult, { status: 'failed' }> {
  return result.status === 'failed';
}

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
        status: 'draft',
        platforms: ['x', 'facebook'] 
      });
      
      // GỌI THỰC THI ĐĂNG BÀI THẬT (Tách biệt từng nền tảng)
      const platforms: SupportedPlatform[] = ['x', 'facebook'];
      const results: PlatformPostResult[] = [];
      
      for (const platform of platforms) {
        try {
          await postToSpecificPlatform(platform, content);
          results.push({ platform, status: 'success' });
        } catch (error: unknown) {
          const errorMessage = getErrorMessage(error);
          console.error(`Lỗi đăng ${platform}:`, errorMessage);
          results.push({ platform, status: 'failed', error: errorMessage });
        }
      }

      const anySuccess = results.some(r => r.status === 'success');
      const failedResults = results.filter(isFailedResult);
      newPost.status = anySuccess ? 'posted' : 'failed';
      newPost.logs = results.map((result) => ({
        message: result.status === 'success'
          ? `[${result.platform}] posted successfully`
          : `[${result.platform}] ${result.error}`,
        timestamp: new Date(),
      }));
      await newPost.save();

      // Kiểm tra nếu tất cả đều thất bại thì mới trả về lỗi 500
      const credentialHints = failedResults.map((r) => {
        if (r.error.includes('Unauthorized')) {
          return `[${r.platform}] Access token/secret không hợp lệ hoặc đã hết hạn.`;
        }
        if (r.error.includes('Application has been deleted')) {
          return `[${r.platform}] App Facebook đã bị xoá hoặc không còn hoạt động.`;
        }
        if (r.error.includes('credentials not configured')) {
          return `[${r.platform}] Chưa cấu hình credentials trong ENV hoặc SocialAccount.`;
        }
        return `[${r.platform}] ${r.error}`;
      });

      if (!anySuccess) {

        return NextResponse.json({ 
          success: false,
          error: 'Tất cả các nền tảng đều thất bại', 
          details: results,
          hints: credentialHints,
          postId: newPost._id,
        }, { status: 200 });
      }

      return NextResponse.json({
        success: true,
        post: newPost,
        results,
        partialFailure: failedResults.length > 0,
        hints: credentialHints,
      });
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
