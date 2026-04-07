import { scrapeNews } from "../news/scraper";
import { generateCaption } from "../ai/gemini";
import { Post, SocialAccount, ProcessedArticle } from "../../models";
import connectDB from "../db/mongodb";
import { MetaClient } from "../social-clients/MetaClient";
import { XClient } from "../social-clients/XClient";
import { TikTokClient } from "../social-clients/TikTokClient";

export async function processNewsAndPost(url: string) {
  await connectDB();

  // 1. Scrape News
  const news = await scrapeNews(url);
  if (!news) throw new Error("Could not scrape news");

  // 2. Generate content with AI
  const caption = await generateCaption(news.content);

  // 3. Create Post Record in DB
  const newPost = await Post.create({
    content: caption,
    sourceUrl: url,
    aiGenerated: true,
    status: 'scheduled',
    platforms: ['facebook', 'instagram', 'x', 'tiktok']
  });

  // 4. Post to all platforms
  const platforms = ['facebook', 'x'];
  for (const platform of platforms) {
    await postToSpecificPlatform(platform, caption, url);
  }

  newPost.status = 'posted';
  await newPost.save();

  return newPost;
}

export async function postToSpecificPlatform(platform: string, content: string, url?: string) {
  const account = await SocialAccount.findOne({ platform });
  if (!account) {
    console.warn(`No active account found for platform: ${platform}`);
    return;
  }

  try {
    if (platform === 'facebook') {
      const client = new MetaClient();
      await client.postToFacebookPage(
        process.env.FB_PAGE_ID!,
        process.env.FB_PAGE_TOKEN!,
        content,
        url || undefined
      );
    } else if (platform === 'x') {
      const client = new XClient(
        process.env.X_API_KEY!,
        process.env.X_API_SECRET!,
        account.accessToken,
        (account as any).accessSecret
      );
      await client.postTweet(content);
    }
    console.log(`Successfully posted to ${platform}`);
  } catch (error) {
    console.error(`Failed to post to ${platform}:`, error);
    throw error;
  }
}

export async function runAutoPilotForPlatform(platform: string) {
  await connectDB();
  console.log(`[Auto-Pilot] Starting automation for ${platform}...`);

  // 1. Tìm bài báo mới nhất chưa đăng lên platform này
  const article = await ProcessedArticle.findOne({
    postedPlatforms: { $ne: platform },
    status: { $ne: 'ignored' }
  }).sort({ createdAt: -1 });

  if (!article) {
    console.log(`[Auto-Pilot] No new articles to post for ${platform}.`);
    return;
  }

  try {
    console.log(`[Auto-Pilot] Processing article: ${article.title}`);
    
    // 2. Scrape & Gen
    const news = await scrapeNews(article.link);
    if (!news) throw new Error("Could not scrape news content");
    
    const caption = await generateCaption(news.content);

    // 3. Post
    await postToSpecificPlatform(platform, caption, article.link);

    // 4. Update status
    await ProcessedArticle.updateOne(
      { _id: article._id },
      { 
        $addToSet: { postedPlatforms: platform },
        $set: { status: 'posted' }
      }
    );

    console.log(`[Auto-Pilot] Automation finished for ${platform}.`);
  } catch (error) {
    console.error(`[Auto-Pilot] Error in automation for ${platform}:`, error);
  }
}
