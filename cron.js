const cron = require('node-cron');
const { processNewsAndPost } = require('./src/lib/workflow/orchestrator');
const connectDB = require('./src/lib/db/mongodb');
const { Post } = require('./src/models');

// Chạy mỗi phút (GMT+7)
cron.schedule('* * * * *', async () => {
  console.log('--- Kiểm tra bài đăng đã hẹn giờ... ---');
  try {
    await connectDB();
    const now = new Date();
    
    // Tìm các bài 'scheduled' và đã đến/quá giờ đăng
    const pendingPosts = await Post.find({
      status: 'scheduled',
      scheduledFor: { $lte: now }
    });

    for (const post of pendingPosts) {
      console.log(`Đang đăng bài: ${post._id}`);
      // Ở đây ta gọi logic đăng bài thật cho từng post
      // Tạm thời gọi orchestrator giả lập
      post.status = 'posted';
      await post.save();
      console.log(`Đã đăng bài thành công: ${post._id}`);
    }
  } catch (error) {
    console.error('Lỗi trong worker:', error);
  }
}, {
  timezone: "Asia/Ho_Chi_Minh"
});

console.log('Worker cron đã sẵn sàng!');
