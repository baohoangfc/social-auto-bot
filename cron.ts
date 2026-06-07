import cron from 'node-cron';
import connectDB from './src/lib/db/mongodb';
import { fetchRSS } from './src/lib/news/scraper';
import { INTERNATIONAL_SOURCES } from './src/lib/news/sources';
import { ProcessedArticle } from './src/models';
import { runAutoPilotForPlatform, processScheduledPosts } from './src/lib/workflow/orchestrator';

// 1. Quét tin tức quốc tế mới (mỗi giờ)
cron.schedule(
  '0 * * * *',
  async () => {
    console.log('--- [Aggregator] Đang quét tin tức quốc tế mới... ---');
    try {
      await connectDB();

      for (const source of INTERNATIONAL_SOURCES) {
        console.log(`[Aggregator] Đang quét nguồn: ${source.name}`);
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
        }
      }
      console.log('--- [Aggregator] Quét tin hoàn tất. ---');
    } catch (error) {
      console.error('[Aggregator] Lỗi:', error);
    }
  },
  { timezone: 'Asia/Ho_Chi_Minh' }
);

// 2. Thực thi bài hẹn giờ (mỗi phút)
cron.schedule(
  '* * * * *',
  async () => {
    try {
      await processScheduledPosts();
    } catch (error) {
      console.error('[Cron] Scheduled posts error:', error);
    }
  },
  { timezone: 'Asia/Ho_Chi_Minh' }
);

// 3. Tự động đăng lên X (mỗi 2 giờ)
cron.schedule(
  '0 */2 * * *',
  async () => {
    console.log('--- [Cron] Trigger automation for X ---');
    try {
      await runAutoPilotForPlatform('x');
    } catch (error) {
      console.error('[Cron] X error:', error);
    }
  },
  { timezone: 'Asia/Ho_Chi_Minh' }
);

// 4. Tự động đăng lên Facebook (mỗi 3 giờ)
cron.schedule(
  '0 */3 * * *',
  async () => {
    console.log('--- [Cron] Trigger automation for Facebook ---');
    try {
      await runAutoPilotForPlatform('facebook');
    } catch (error) {
      console.error('[Cron] Facebook error:', error);
    }
  },
  { timezone: 'Asia/Ho_Chi_Minh' }
);

console.log('Hệ thống Auto-Pilot đã sẵn sàng (Scheduled: 1 phút, X: 2h, FB: 3h, RSS: 1h)');
