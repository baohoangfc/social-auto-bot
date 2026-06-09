import { NextRequest, NextResponse } from 'next/server';
import { buildFacebookLoginUrl, buildFacebookRedirectUri, getFacebookOAuthConfig } from '@/lib/social-clients/MetaOAuth';

export const dynamic = 'force-dynamic';

const STATE_COOKIE = 'fb_oauth_state';

function getErrorRedirect(request: NextRequest, error: string) {
  const redirectUrl = new URL('/', request.url);
  redirectUrl.searchParams.set('facebookConnect', 'error');
  redirectUrl.searchParams.set('message', error);
  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: NextRequest) {
  try {
    const config = getFacebookOAuthConfig();
    const state = crypto.randomUUID();
    const redirectUri = buildFacebookRedirectUri(request.nextUrl.origin);
    const loginUrl = buildFacebookLoginUrl(config, redirectUri, state);
    const response = NextResponse.redirect(loginUrl);

    response.cookies.set({
      name: STATE_COOKIE,
      value: state,
      httpOnly: true,
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
      path: '/',
      maxAge: 10 * 60,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể bắt đầu Facebook Login.';
    return getErrorRedirect(request, message);
  }
}
