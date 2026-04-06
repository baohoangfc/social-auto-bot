import { scrapeNews } from "../news/scraper";
import { generateCaption } from "../ai/gemini";
import { Post, SocialAccount } from "../../models";
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

  // 3. Create Post in DB
  const newPost = await Post.create({
    content: caption,
    sourceUrl: url,
    aiGenerated: true,
    status: 'scheduled',
    platforms: ['facebook', 'instagram', 'x', 'tiktok']
  });

  // 4. Get active social accounts
  const accounts = await SocialAccount.find();

  // 5. Post to each platform
  for (const account of accounts) {
    try {
      if (account.platform === 'facebook') {
        const client = new MetaClient();
        await client.postToFacebookPage(
          process.env.FB_PAGE_ID!,
          process.env.FB_PAGE_TOKEN!,
          caption,
          url || undefined
        );
      } else if (account.platform === 'x') {
        const client = new XClient(
          process.env.X_API_KEY!,
          process.env.X_API_SECRET!,
          account.accessToken, // Đây là User Access Token trong DB
          (account as any).accessSecret // Đây là User Access Secret trong DB
        );
        await client.postTweet(caption);
      }
      // ... thêm các platform khác
    } catch (error) {
      console.error(`Failed to post to ${account.platform}:`, error);
    }
  }

  newPost.status = 'posted';
  await newPost.save();

  return newPost;
}
