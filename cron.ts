import cron from 'node-cron';
import { runNewsAggregator, runAutoPilotForPlatform, processScheduledPosts } from './src/lib/workflow/orchestrator';

cron.schedule(
  '0 * * * *',
  async () => {
    console.log('--- [Aggregator] Đang quét tin tức quốc tế mới... ---');
    try {
      const result = await runNewsAggregator();
      console.log(`--- [Aggregator] Quét tin hoàn tất. ${result.newCount} bài mới. ---`);
    } catch (error) {
      console.error('[Aggregator] Lỗi:', error);
    }
  },
  { timezone: 'Asia/Ho_Chi_Minh' }
);

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
