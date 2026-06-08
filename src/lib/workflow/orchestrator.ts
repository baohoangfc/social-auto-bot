import { scrapeNews, fetchRSS } from "../news/scraper";
import { INTERNATIONAL_SOURCES } from "../news/sources";
import { generateCaption, generatePostImage, parseImageFromMediaUrls, type GeneratedImage } from "../ai/gemini";
import { Post, SocialAccount, ProcessedArticle, FacebookPage } from "../../models";
import connectDB from "../db/mongodb";
import { MetaClient } from "../social-clients/MetaClient";
import { XClient } from "../social-clients/XClient";

type SupportedPlatform = 'facebook' | 'x';

type FacebookPageTarget = {
  pageId: string;
  pageName?: string;
  pageAccessToken: string;
};

type PublishResult = {
  platform: 'facebook';
  pageId: string;
  pageName?: string;
  status: 'success' | 'failed';
  externalPostId?: string;
  error?: string;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export async function postToFacebookPageTarget(
  page: FacebookPageTarget,
  content: string,
  url?: string,
  image?: GeneratedImage | null
) {
  if (!page.pageId || !page.pageAccessToken) {
    throw new Error('facebook page credentials not configured');
  }

  const client = new MetaClient();
  if (image) {
    return client.postPhotoToFacebookPage(
      page.pageId,
      page.pageAccessToken,
      content,
      Buffer.from(image.base64, 'base64'),
      image.mimeType,
      url
    );
  }

  return client.postToFacebookPage(page.pageId, page.pageAccessToken, content, url);
}

export async function publishToFacebookPages(
  pageIds: string[],
  content: string,
  url?: string,
  image?: GeneratedImage | null
): Promise<PublishResult[]> {
  await connectDB();
  const uniquePageIds = [...new Set(pageIds.filter(Boolean))];
  const pages = await FacebookPage.find({ pageId: { $in: uniquePageIds }, isActive: true });
  const foundPageIds = new Set(pages.map((page) => page.pageId));
  const results: PublishResult[] = [];

  for (const missingPageId of uniquePageIds.filter((pageId) => !foundPageIds.has(pageId))) {
    results.push({
      platform: 'facebook',
      pageId: missingPageId,
      status: 'failed',
      error: 'Facebook Page không tồn tại hoặc đang bị tắt',
    });
  }

  for (const page of pages) {
    try {
      const data = await postToFacebookPageTarget({
        pageId: page.pageId,
        pageName: page.pageName,
        pageAccessToken: page.pageAccessToken,
      }, content, url, image);

      results.push({
        platform: 'facebook',
        pageId: page.pageId,
        pageName: page.pageName,
        status: 'success',
        externalPostId: data?.id || data?.post_id,
      });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error(`Failed to post to Facebook Page ${page.pageId}:`, errorMessage);
      results.push({
        platform: 'facebook',
        pageId: page.pageId,
        pageName: page.pageName,
        status: 'failed',
        error: errorMessage,
      });
    }
  }

  return results;
}

export async function postToSpecificPlatform(
  platform: string,
  content: string,
  url?: string,
  image?: GeneratedImage | null
) {
  const account = await SocialAccount.findOne({ platform });

  const xToken = process.env.X_ACCESS_TOKEN || account?.accessToken;
  const xSecret = process.env.X_ACCESS_TOKEN_SECRET || account?.accessSecret;
  const xApiKey = process.env.X_API_KEY;
  const xApiSecret = process.env.X_API_SECRET;
  const fbToken = process.env.FB_PAGE_TOKEN || account?.accessToken;
  const fbPageId = process.env.FB_PAGE_ID;

  try {
    if (platform === 'facebook') {
      if (!fbToken || !fbPageId) {
        throw new Error('facebook credentials not configured');
      }
      await postToFacebookPageTarget({ pageId: fbPageId, pageAccessToken: fbToken }, content, url, image);
    } else if (platform === 'x') {
      if (!xToken || !xSecret) {
        throw new Error('x credentials not configured');
      }
      if (!xApiKey || !xApiSecret) {
        throw new Error('x app credentials not configured');
      }
      const client = new XClient(xApiKey, xApiSecret, xToken, xSecret);
      const tweetText = url ? `${content}\n\n${url}` : content;
      await client.postTweet(tweetText);
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    console.log(`Successfully posted to ${platform}`);
  } catch (error) {
    console.error(`Failed to post to ${platform}:`, error);
    throw error;
  }
}

export async function runNewsAggregator() {
  await connectDB();
  let newCount = 0;

  for (const source of INTERNATIONAL_SOURCES) {
    const items = await fetchRSS(source.url);

    for (const item of items) {
      const existing = await ProcessedArticle.findOne({ link: item.link });
      if (existing) continue;

      await ProcessedArticle.create({
        title: item.title,
        link: item.link,
        sourceId: source.id,
        status: 'processed',
      });
      newCount += 1;
    }
  }

  return { newCount };
}

export async function processScheduledPosts() {
  await connectDB();

  const duePosts = await Post.find({
    status: 'scheduled',
    scheduledFor: { $lte: new Date() },
  })
    .sort({ scheduledFor: 1 })
    .limit(10);

  if (!duePosts.length) return;

  console.log(`[Scheduler] Processing ${duePosts.length} scheduled post(s)...`);

  for (const post of duePosts) {
    const image = parseImageFromMediaUrls(post.mediaUrls);
    const hasFacebookTargets = Array.isArray(post.targets) && post.targets.some((target: { platform: string; status?: string }) => target.platform === 'facebook' && target.status !== 'posted');

    if (hasFacebookTargets) {
      const pendingFacebookPageIds = post.targets
        .filter((target: { platform: string; pageId?: string; status?: string }) => target.platform === 'facebook' && target.pageId && target.status !== 'posted')
        .map((target: { pageId: string }) => target.pageId);
      const results = await publishToFacebookPages(pendingFacebookPageIds, post.content, post.sourceUrl, image);
      const resultMap = new Map(results.map((result) => [result.pageId, result]));

      post.targets = post.targets.map((target: { platform: string; pageId?: string; pageName?: string; status?: string; externalPostId?: string; error?: string; postedAt?: Date }) => {
        if (target.platform !== 'facebook' || !target.pageId) return target;
        const result = resultMap.get(target.pageId);
        if (!result) return target;
        return {
          ...target,
          pageName: result.pageName || target.pageName,
          status: result.status === 'success' ? 'posted' : 'failed',
          externalPostId: result.externalPostId,
          error: result.error,
          postedAt: result.status === 'success' ? new Date() : target.postedAt,
        };
      });

      const anySuccess = results.some((result) => result.status === 'success');
      post.status = anySuccess ? 'posted' : 'failed';
      post.logs = results.map((result) => ({
        message:
          result.status === 'success'
            ? `[facebook:${result.pageName || result.pageId}] posted successfully`
            : `[facebook:${result.pageName || result.pageId}] ${result.error}`,
        timestamp: new Date(),
      }));
      await post.save();
      console.log(`[Scheduler] Post ${post._id} finished with status: ${post.status}`);
      continue;
    }

    const platforms = (post.platforms?.length ? post.platforms : ['x', 'facebook']) as SupportedPlatform[];
    const results: Array<{ platform: string; status: 'success' | 'failed'; error?: string }> = [];

    for (const platform of platforms) {
      try {
        await postToSpecificPlatform(platform, post.content, post.sourceUrl, image);
        results.push({ platform, status: 'success' });
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error(`[Scheduler] Failed to post ${post._id} to ${platform}:`, errorMessage);
        results.push({ platform, status: 'failed', error: errorMessage });
      }
    }

    const anySuccess = results.some((result) => result.status === 'success');
    post.status = anySuccess ? 'posted' : 'failed';
    post.logs = results.map((result) => ({
      message:
        result.status === 'success'
          ? `[${result.platform}] posted successfully`
          : `[${result.platform}] ${result.error}`,
      timestamp: new Date(),
    }));
    await post.save();
    console.log(`[Scheduler] Post ${post._id} finished with status: ${post.status}`);
  }
}

export async function runAutoPilotForPlatform(platform: string) {
  await connectDB();
  console.log(`[Auto-Pilot] Starting automation for ${platform}...`);

  const article = await ProcessedArticle.findOne({
    postedPlatforms: { $ne: platform },
    status: { $ne: 'ignored' },
  }).sort({ createdAt: -1 });

  if (!article) {
    console.log(`[Auto-Pilot] No new articles to post for ${platform}.`);
    return;
  }

  try {
    console.log(`[Auto-Pilot] Processing article: ${article.title}`);

    const news = await scrapeNews(article.link);
    if (!news) throw new Error("Could not scrape news content");

    const caption = await generateCaption(news.content);
    const image = platform === 'facebook' ? await generatePostImage(news.content, news.title) : null;

    await postToSpecificPlatform(platform, caption, article.link, image);

    await ProcessedArticle.updateOne(
      { _id: article._id },
      {
        $addToSet: { postedPlatforms: platform },
        $set: { status: 'posted' },
      }
    );

    console.log(`[Auto-Pilot] Automation finished for ${platform}.`);
  } catch (error) {
    console.error(`[Auto-Pilot] Error in automation for ${platform}:`, error);
  }
}
