# Social Auto-Bot

Bot tự động soạn và đăng bài lên Facebook/X từ tin tức quốc tế, dùng Gemini AI để viết caption và sinh ảnh minh họa.

## Tính năng

- Dashboard web: duyệt tin RSS, generate caption + ảnh AI, đăng ngay hoặc hẹn giờ
- Auto-pilot: quét tin → Gemini → đăng Facebook/X theo lịch
- Scheduled posts: lưu MongoDB và tự đăng khi đến giờ

## Deploy lên Vercel

### 1. Import project

1. Vào [vercel.com/new](https://vercel.com/new)
2. Import repo GitHub: `baohoangfc/social-auto-bot`
3. Framework Preset: **Next.js** (tự nhận diện)
4. Build Command: `npm run build` (mặc định)
5. Output Directory: `.next` (mặc định)

### 2. Thêm Environment Variables

Trong **Project Settings → Environment Variables**, thêm:

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `MONGODB_URI` | Có | MongoDB Atlas connection string |
| `GEMINI_API_KEY` | Có | Google AI Studio API key |
| `FB_PAGE_ID` | Có (FB) | Facebook Page ID |
| `FB_PAGE_TOKEN` | Có (FB) | Facebook Page access token |
| `X_API_KEY` | Tuỳ chọn | X app API key |
| `X_API_SECRET` | Tuỳ chọn | X app API secret |
| `X_ACCESS_TOKEN` | Tuỳ chọn | X user access token |
| `X_ACCESS_TOKEN_SECRET` | Tuỳ chọn | X user access token secret |
| `CRON_SECRET` | Khuyến nghị | Secret bảo vệ cron endpoints |

### 3. Deploy

Nhấn **Deploy**. Vercel sẽ build và host dashboard tại URL dạng `https://your-project.vercel.app`.

### 4. Cron jobs (tự động trên Vercel)

File `vercel.json` đã cấu hình sẵn:

| Endpoint | Lịch | Chức năng |
|----------|------|-----------|
| `/api/cron/process-scheduled` | Mỗi phút | Đăng bài hẹn giờ |
| `/api/cron/aggregator` | Mỗi giờ | Quét tin RSS mới |
| `/api/cron/auto-pilot/x` | 2 giờ/lần | Auto đăng X |
| `/api/cron/auto-pilot/facebook` | 3 giờ/lần | Auto đăng Facebook |

> **Lưu ý:** Cron chạy mỗi phút cần gói **Vercel Pro**. Gói Hobby giới hạn 2 cron jobs và tối đa 1 lần/ngày.

### 5. MongoDB Atlas

1. Tạo cluster free tại [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Network Access → thêm `0.0.0.0/0` (cho phép Vercel kết nối)
3. Copy connection string vào `MONGODB_URI`

## Chạy local

```bash
cp .env.example .env.local
# điền các biến môi trường

npm install
npm run dev        # Dashboard: http://localhost:3000
npm run cron       # Background jobs (local only)
```

## Cấu trúc chính

```
src/app/page.tsx              # Dashboard UI
src/app/api/generate/         # AI caption + image
src/app/api/post/             # Đăng / hẹn giờ
src/app/api/cron/             # Cron endpoints (Vercel)
src/lib/workflow/orchestrator.ts
vercel.json                   # Vercel cron + region
```
