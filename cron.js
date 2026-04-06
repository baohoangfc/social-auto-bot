const cron = require('node-cron');
const { fetchRSS } = require('./src/lib/news/scraper');
const { processNewsAndPost } = require('./src/lib/workflow/orchestrator');
const connectDB = require('./src/lib/db/mongodb');
const { Post, NewsSource, ProcessedArticle } = require('./src/models');
const { INTERNATIONAL_SOURCES } = require('./src/lib/news/sources');

// Chạy mỗi giờ để quét tin tức mới (GMT+7)
cron.schedule('0 * * * *', async () => {
  console.log('--- Đang quét tin tức quốc tế mới... ---');
  try {
    await connectDB();
    
    for (const source of INTERNATIONAL_SOURCES) {
      console.log(`Đang quét nguồn: ${source.name}`);
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

        // NẾU NGUỒN TIN CÓ BẬT AUTO-POST (Giả sử mặc định một số nguồn là auto)
        const sourceConfig = await NewsSource.findOne({ url: source.url });
        if (sourceConfig?.autoPost) {
          console.log(`Tự động đăng bài: ${item.title}`);
          await processNewsAndPost(item.link);
          await ProcessedArticle.updateOne({ link: item.link }, { status: 'posted' });
          console.log(`Đã tự động đăng bài thành công!`);
        }
      }
    }
  } catch (error) {
    console.error('Lỗi trong worker quét tin:', error);
  }
}, {
  timezone: "Asia/Ho_Chi_Minh"
});

// Worker cũ quét bài hẹn giờ (Chạy mỗi phút)
cron.schedule('* * * * *', async () => {
  // ... (giữ nguyên logic cũ như đã triển khai trước đó)
}, {
  timezone: "Asia/Ho_Chi_Minh"
});

console.log('Hệ thống Automation & Aggregator đã sẵn sàng!');
