import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { FacebookPage, Post } from '@/models';
import { postToSpecificPlatform, publishToFacebookPages } from '@/lib/workflow/orchestrator';
import { parseImageFromMediaUrls } from '@/lib/ai/gemini';

export const maxDuration = 120;

type SupportedPlatform = 'x' | 'facebook';

type PostTargetInput = {
  platform?: string;
  pageId?: string;
};

type FacebookPostResult = {
  platform: 'facebook';
  pageId: string;
  pageName?: string;
  status: 'success' | 'failed';
  externalPostId?: string;
  error?: string;
};

type PlatformPostResult =
  | { platform: SupportedPlatform; status: 'success' }
  | { platform: SupportedPlatform; status: 'failed'; error: string };

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function isFailedFacebookResult(result: FacebookPostResult): result is FacebookPostResult & { status: 'failed'; error: string } {
  return result.status === 'failed';
}

function isFailedResult(result: PlatformPostResult): result is Extract<PlatformPostResult, { status: 'failed' }> {
  return result.status === 'failed';
}

function normalizeTargetPageIds(targets: unknown, facebookPageIds: unknown): string[] {
  const idsFromTargets = Array.isArray(targets)
    ? targets
        .filter((target: PostTargetInput) => target?.platform === 'facebook' && typeof target.pageId === 'string')
        .map((target: PostTargetInput) => target.pageId?.trim())
        .filter((pageId): pageId is string => Boolean(pageId))
    : [];

  const idsFromPageIds = Array.isArray(facebookPageIds)
    ? facebookPageIds
        .filter((pageId): pageId is string => typeof pageId === 'string')
        .map((pageId) => pageId.trim())
        .filter(Boolean)
    : [];

  return [...new Set([...idsFromTargets, ...idsFromPageIds])];
}

function buildCredentialHints(results: Array<FacebookPostResult | PlatformPostResult>) {
  return results
    .filter((result): result is (FacebookPostResult & { status: 'failed'; error: string }) | Extract<PlatformPostResult, { status: 'failed' }> => result.status === 'failed')
    .map((result) => {
      const target = 'pageId' in result
        ? `facebook:${result.pageName || result.pageId}`
        : result.platform;
      const error = result.error || 'Unknown error';
      if (error.includes('Unauthorized') || error.includes('OAuth')) {
        return `[${target}] Access token không hợp lệ, thiếu quyền hoặc đã hết hạn.`;
      }
      if (error.includes('Application has been deleted')) {
        return `[${target}] App Facebook đã bị xoá hoặc không còn hoạt động.`;
      }
      if (error.includes('credentials not configured')) {
        return `[${target}] Chưa cấu hình credentials trong ENV hoặc database.`;
      }
      return `[${target}] ${error}`;
    });
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const { content, scheduledFor, status, sourceUrl, mediaUrls, targets, facebookPageIds } = await req.json();

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const normalizedMediaUrls = Array.isArray(mediaUrls)
      ? mediaUrls.filter((url: unknown): url is string => typeof url === 'string' && url.length > 0)
      : [];
    const targetPageIds = normalizeTargetPageIds(targets, facebookPageIds);

    if (targetPageIds.length > 0) {
      const pages = await FacebookPage.find({ pageId: { $in: targetPageIds } }).lean();
      const pageNameMap = new Map(pages.map((page) => [page.pageId, page.pageName]));
      const postTargets = targetPageIds.map((pageId) => ({
        platform: 'facebook',
        pageId,
        pageName: pageNameMap.get(pageId),
        status: 'pending',
      }));

      if (scheduledFor || status === 'scheduled') {
        const scheduledPost = await Post.create({
          content,
          sourceUrl: sourceUrl || undefined,
          mediaUrls: normalizedMediaUrls,
          scheduledFor: new Date(scheduledFor),
          status: 'scheduled',
          platforms: ['facebook'],
          targets: postTargets,
        });

        return NextResponse.json({ success: true, post: scheduledPost });
      }

      const newPost = await Post.create({
        content,
        sourceUrl: sourceUrl || undefined,
        mediaUrls: normalizedMediaUrls,
        status: 'draft',
        platforms: ['facebook'],
        targets: postTargets,
      });

      const image = parseImageFromMediaUrls(normalizedMediaUrls);
      const results = await publishToFacebookPages(targetPageIds, content, sourceUrl, image);
      const resultMap = new Map(results.map((result) => [result.pageId, result]));

      newPost.targets = postTargets.map((target) => {
        const result = resultMap.get(target.pageId);
        if (!result) return target;
        return {
          ...target,
          pageName: result.pageName || target.pageName,
          status: result.status === 'success' ? 'posted' : 'failed',
          externalPostId: result.externalPostId,
          error: result.error,
          postedAt: result.status === 'success' ? new Date() : undefined,
        };
      });
      const anySuccess = results.some((result) => result.status === 'success');
      const failedResults = results.filter(isFailedFacebookResult);
      newPost.status = anySuccess ? 'posted' : 'failed';
      newPost.logs = results.map((result) => ({
        message:
          result.status === 'success'
            ? `[facebook:${result.pageName || result.pageId}] posted successfully`
            : `[facebook:${result.pageName || result.pageId}] ${result.error}`,
        timestamp: new Date(),
      }));
      await newPost.save();

      if (!anySuccess) {
        return NextResponse.json({
          success: false,
          error: 'Tất cả Facebook Page đều thất bại',
          details: results,
          hints: buildCredentialHints(results),
          postId: newPost._id,
        }, { status: 200 });
      }

      return NextResponse.json({
        success: true,
        post: newPost,
        results,
        partialFailure: failedResults.length > 0,
        hints: buildCredentialHints(results),
      });
    }

    if (!scheduledFor || status === 'posted') {
      const newPost = await Post.create({
        content,
        sourceUrl: sourceUrl || undefined,
        mediaUrls: normalizedMediaUrls,
        status: 'draft',
        platforms: ['x', 'facebook'],
      });

      const platforms: SupportedPlatform[] = ['x', 'facebook'];
      const image = parseImageFromMediaUrls(normalizedMediaUrls);
      const results: PlatformPostResult[] = [];

      for (const platform of platforms) {
        try {
          await postToSpecificPlatform(platform, content, sourceUrl, image);
          results.push({ platform, status: 'success' });
        } catch (error: unknown) {
          const errorMessage = getErrorMessage(error);
          console.error(`Lỗi đăng ${platform}:`, errorMessage);
          results.push({ platform, status: 'failed', error: errorMessage });
        }
      }

      const anySuccess = results.some((r) => r.status === 'success');
      const failedResults = results.filter(isFailedResult);
      newPost.status = anySuccess ? 'posted' : 'failed';
      newPost.logs = results.map((result) => ({
        message:
          result.status === 'success'
            ? `[${result.platform}] posted successfully`
            : `[${result.platform}] ${result.error}`,
        timestamp: new Date(),
      }));
      await newPost.save();

      const credentialHints = buildCredentialHints(results);

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

    const scheduledPost = await Post.create({
      content,
      sourceUrl: sourceUrl || undefined,
      mediaUrls: normalizedMediaUrls,
      scheduledFor: new Date(scheduledFor),
      status: 'scheduled',
      platforms: ['x', 'facebook'],
    });

    return NextResponse.json({ success: true, post: scheduledPost });
  } catch (error) {
    console.error('Post API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
