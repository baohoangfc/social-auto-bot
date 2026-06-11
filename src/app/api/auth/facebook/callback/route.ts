import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { FacebookPage } from '@/models';
import {
  buildFacebookRedirectUri,
  exchangeFacebookCodeForToken,
  exchangeForLongLivedFacebookToken,
  fetchManagedFacebookPages,
} from '@/lib/social-clients/MetaOAuth';

export const dynamic = 'force-dynamic';

const STATE_COOKIE = 'fb_oauth_state';

function buildDashboardRedirect(request: NextRequest, params: Record<string, string | number>) {
  const redirectUrl = new URL('/', request.url);
  for (const [key, value] of Object.entries(params)) {
    redirectUrl.searchParams.set(key, String(value));
  }
  return redirectUrl;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Không thể kết nối Facebook.';
}

export async function GET(request: NextRequest) {
  try {
    const state = request.nextUrl.searchParams.get('state');
    const code = request.nextUrl.searchParams.get('code');
    const facebookError = request.nextUrl.searchParams.get('error_message') || request.nextUrl.searchParams.get('error');
    const expectedState = request.cookies.get(STATE_COOKIE)?.value;

    if (facebookError) {
      throw new Error(facebookError);
    }

    if (!state || !expectedState || state !== expectedState) {
      throw new Error('Facebook OAuth state không hợp lệ. Vui lòng thử kết nối lại.');
    }

    if (!code) {
      throw new Error('Facebook không trả về authorization code.');
    }

    const redirectUri = buildFacebookRedirectUri(request.nextUrl.origin);
    const shortLivedToken = await exchangeFacebookCodeForToken(code, redirectUri);
    const userToken = await exchangeForLongLivedFacebookToken(shortLivedToken.accessToken);
    const pages = await fetchManagedFacebookPages(userToken.accessToken);

    await connectDB();
    for (const page of pages) {
      await FacebookPage.findOneAndUpdate(
        { pageId: page.pageId },
        {
          $set: {
            pageId: page.pageId,
            pageName: page.pageName,
            pageAccessToken: page.pageAccessToken,
            tokenExpiresAt: userToken.expiresAt,
            profilePicture: page.profilePicture,
            category: page.category,
            isActive: true,
          },
          $setOnInsert: {
            contentProfile: {
              topic: '',
              tone: 'Chuyên nghiệp, rõ ràng, thu hút',
              language: 'Tiếng Việt',
              prompt: '',
              hashtags: ['#BreakingNews', '#FacebookPage'],
              sourceIds: [],
            },
            postingSettings: {
              autoPost: false,
              requireApproval: true,
              defaultScheduleTimes: [],
            },
          },
        },
        { new: true, upsert: true, runValidators: true }
      );
    }

    const successResponse = NextResponse.redirect(buildDashboardRedirect(request, {
      facebookConnect: 'success',
      pages: pages.length,
    }));
    successResponse.cookies.delete(STATE_COOKIE);
    return successResponse;
  } catch (error) {
    const errorResponse = NextResponse.redirect(buildDashboardRedirect(request, {
      facebookConnect: 'error',
      message: getErrorMessage(error),
    }));
    errorResponse.cookies.delete(STATE_COOKIE);
    return errorResponse;
  }
}
