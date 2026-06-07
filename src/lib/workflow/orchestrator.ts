import { scrapeNews } from "../news/scraper";
import { generateCaption, generatePostImage, parseImageFromMediaUrls, type GeneratedImage } from "../ai/gemini";
import { Post, SocialAccount, ProcessedArticle } from "../../models";
import connectDB from "../db/mongodb";
import { MetaClient } from "../social-clients/MetaClient";
import { XClient } from "../social-clients/XClient";

type SupportedPlatform = 'facebook' | 'x';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
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
      const client = new MetaClient();

      if (image) {
        await client.postPhotoToFacebookPage(
          fbPageId,
          fbToken,
          content,
          Buffer.from(image.base64, 'base64'),
          image.mimeType,
          url
        );
      } else {
        await client.postToFacebookPage(fbPageId, fbToken, content, url);
      }
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
    const platforms = (post.platforms?.length ? post.platforms : ['x', 'facebook']) as SupportedPlatform[];
    const image = parseImageFromMediaUrls(post.mediaUrls);
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
