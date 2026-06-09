const META_GRAPH_VERSION = 'v20.0';
const DEFAULT_PAGE_FIELDS = 'id,name,access_token,tasks,category,picture{url}';

export type FacebookOAuthConfig = {
  appId: string;
  appSecret: string;
  scopes: string[];
};

type FacebookTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: FacebookApiError;
};

type FacebookApiError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
};

type FacebookPicture = {
  data?: {
    url?: string;
  };
};

type FacebookPageApiRecord = {
  id?: string;
  name?: string;
  access_token?: string;
  tasks?: string[];
  category?: string;
  picture?: FacebookPicture;
};

type FacebookAccountsResponse = {
  data?: FacebookPageApiRecord[];
  paging?: {
    next?: string;
  };
  error?: FacebookApiError;
};

export type ManagedFacebookPage = {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  category?: string;
  profilePicture?: string;
  tasks: string[];
};

export type FacebookUserToken = {
  accessToken: string;
  expiresAt?: Date;
};

function getMetaEnv(name: string, fallbackName?: string) {
  return process.env[name] || (fallbackName ? process.env[fallbackName] : undefined) || '';
}

function getErrorMessage(error: FacebookApiError | undefined, fallback: string) {
  return error?.message || fallback;
}

function assertFacebookResponse<T extends { error?: FacebookApiError }>(data: T, fallback: string) {
  if (data.error) {
    throw new Error(getErrorMessage(data.error, fallback));
  }
  return data;
}

export function getFacebookOAuthConfig(): FacebookOAuthConfig {
  const appId = getMetaEnv('META_APP_ID', 'FB_APP_ID');
  const appSecret = getMetaEnv('META_APP_SECRET', 'FB_APP_SECRET');
  const scopes = (process.env.META_FACEBOOK_SCOPES || 'pages_show_list,pages_read_engagement,pages_manage_posts')
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean);

  if (!appId || !appSecret) {
    throw new Error('Thiếu META_APP_ID/META_APP_SECRET hoặc FB_APP_ID/FB_APP_SECRET để bật Facebook Login.');
  }

  return { appId, appSecret, scopes };
}

export function buildFacebookRedirectUri(origin: string) {
  return `${origin}/api/auth/facebook/callback`;
}

export function buildFacebookLoginUrl(config: FacebookOAuthConfig, redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: redirectUri,
    state,
    scope: config.scopes.join(','),
    response_type: 'code',
  });

  return `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

export async function exchangeFacebookCodeForToken(code: string, redirectUri: string): Promise<FacebookUserToken> {
  const config = getFacebookOAuthConfig();
  const params = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token?${params.toString()}`);
  const data = assertFacebookResponse((await response.json()) as FacebookTokenResponse, 'Không thể đổi Facebook code lấy access token.');

  if (!data.access_token) {
    throw new Error('Facebook không trả về user access token.');
  }

  return {
    accessToken: data.access_token,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
  };
}

export async function exchangeForLongLivedFacebookToken(shortLivedToken: string): Promise<FacebookUserToken> {
  const config = getFacebookOAuthConfig();
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: config.appId,
    client_secret: config.appSecret,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token?${params.toString()}`);
  const data = assertFacebookResponse((await response.json()) as FacebookTokenResponse, 'Không thể đổi sang long-lived Facebook token.');

  if (!data.access_token) {
    throw new Error('Facebook không trả về long-lived user access token.');
  }

  return {
    accessToken: data.access_token,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
  };
}

export async function fetchManagedFacebookPages(userAccessToken: string): Promise<ManagedFacebookPage[]> {
  const pages: ManagedFacebookPage[] = [];
  let nextUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/me/accounts?${new URLSearchParams({
    fields: DEFAULT_PAGE_FIELDS,
    access_token: userAccessToken,
  }).toString()}`;

  while (nextUrl) {
    const response = await fetch(nextUrl);
    const data = assertFacebookResponse((await response.json()) as FacebookAccountsResponse, 'Không thể lấy danh sách Facebook Page.');

    for (const page of data.data || []) {
      if (page.id && page.name && page.access_token) {
        pages.push({
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: page.access_token,
          category: page.category,
          profilePicture: page.picture?.data?.url,
          tasks: page.tasks || [],
        });
      }
    }

    nextUrl = data.paging?.next || '';
  }

  return pages;
}
