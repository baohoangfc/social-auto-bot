const cron = require('node-cron');
const { fetchRSS } = require('./src/lib/news/scraper');
const { runAutoPilotForPlatform } = require('./src/lib/workflow/orchestrator');
const connectDB = require('./src/lib/db/mongodb');
const { Post, NewsSource, ProcessedArticle } = require('./src/models');
const { INTERNATIONAL_SOURCES } = require('./src/lib/news/sources');

// 1. Quét tin tức quốc tế mới (Mỗi giờ) - AGGREGATOR ONLY
cron.schedule('0 * * * *', async () => {
  console.log('--- [Aggregator] Đang quét tin tức quốc tế mới... ---');
  try {
    await connectDB();
    
    for (const source of INTERNATIONAL_SOURCES) {
      console.log(`[Aggregator] Đang quét nguồn: ${source.name}`);
      const items = await fetchRSS(source.url);
      
      for (const item of items) {
        // Kiểm tra xem bài đã xử lý chưa
        const existing = await ProcessedArticle.findOne({ link: item.link });
        if (existing) continue;

        // Lưu vào danh sách đã xử lý
        await ProcessedArticle.create({
          title: item.title,
          link: item.link,
          sourceId: source.id,
          status: 'processed'
        });
      }
    }
    console.log('--- [Aggregator] Quét tin hoàn tất. ---');
  } catch (error) {
    console.error('[Aggregator] Lỗi:', error);
  }
}, {
  timezone: "Asia/Ho_Chi_Minh"
});

// 2. Tự động đăng lên X (Mỗi 2 giờ)
cron.schedule('0 */2 * * *', async () => {
  console.log('--- [Cron] Trigger automation for X ---');
  try {
    await runAutoPilotForPlatform('x');
  } catch (error) {
    console.error('[Cron] X error:', error);
  }
}, {
  timezone: "Asia/Ho_Chi_Minh"
});

// 3. Tự động đăng lên Facebook (Mỗi 3 giờ)
cron.schedule('0 */3 * * *', async () => {
  console.log('--- [Cron] Trigger automation for Facebook ---');
  try {
    await runAutoPilotForPlatform('facebook');
  } catch (error) {
    console.error('[Cron] Facebook error:', error);
  }
}, {
  timezone: "Asia/Ho_Chi_Minh"
});

console.log('Hệ thống Auto-Pilot (X: 2h, FB: 3h) đã sẵn sàng!');
