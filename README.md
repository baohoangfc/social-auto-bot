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
| `FB_PAGE_ID` | Có nếu nhập thủ công | Facebook Page ID |
| `FB_PAGE_TOKEN` | Có nếu nhập thủ công | Facebook Page access token |
| `META_APP_ID` | Có nếu dùng Facebook Login | Meta/Facebook App ID |
| `META_APP_SECRET` | Có nếu dùng Facebook Login | Meta/Facebook App Secret |
| `META_FACEBOOK_SCOPES` | Tuỳ chọn | OAuth scopes, mặc định `pages_show_list,pages_read_engagement,pages_manage_posts` |
| `X_API_KEY` | Tuỳ chọn | X app API key |
| `X_API_SECRET` | Tuỳ chọn | X app API secret |
| `X_ACCESS_TOKEN` | Tuỳ chọn | X user access token |
| `X_ACCESS_TOKEN_SECRET` | Tuỳ chọn | X user access token secret |
| `CRON_SECRET` | Khuyến nghị | Secret bảo vệ cron endpoints |

### 3. Kết nối Facebook Login

Để đồng bộ Page tự động từ dashboard:

1. Tạo app trong Meta for Developers và bật Facebook Login.
2. Thêm OAuth redirect URI: `https://your-project.vercel.app/api/auth/facebook/callback` và local URI `http://localhost:3000/api/auth/facebook/callback` nếu chạy local.
3. Cấu hình `META_APP_ID`, `META_APP_SECRET` và các quyền trong `META_FACEBOOK_SCOPES`.
4. Bấm **Connect Facebook** trên dashboard để login, lấy danh sách Page quản lý và lưu Page Access Token vào MongoDB.

Nếu dùng cho người ngoài tài khoản developer/tester của app, các quyền quản lý Page thường cần Meta App Review.

### 4. Deploy

Nhấn **Deploy**. Vercel sẽ build và host dashboard tại URL dạng `https://your-project.vercel.app`.

> **Nếu URL Vercel trả về `404: NOT_FOUND`:** repo đã cấu hình Vercel dùng preset Next.js, `npm ci`, `npm run build`, và rewrite fallback mọi đường dẫn chưa khớp route/static asset về dashboard `/`. Sau khi push, hãy redeploy commit mới nhất rồi kiểm tra:
> 1. Deployment mới nhất có trạng thái **Ready** và source commit đúng branch vừa push.
> 2. Project đang trỏ đúng repo/branch và **Root Directory** là thư mục chứa `package.json`.
> 3. Domain/alias `https://your-project.vercel.app` đang được gán cho project này trong **Project Settings → Domains**.
> 4. Runtime Node.js dùng cho build đạt tối thiểu `20.9.0` (repo đã khai báo trong `package.json`).

### 5. Cron jobs (tự động trên Vercel)

**Gói Hobby (miễn phí):** `vercel.json` chạy 1 cron/ngày lúc 00:00 giờ Việt Nam (`/api/cron/daily`):
- Quét tin RSS mới
- Auto-pilot đăng X + Facebook
- Xử lý bài hẹn giờ đến hạn

**Gói Pro:** đổi tên `vercel.pro.json` → `vercel.json` để bật cron chi tiết (mỗi phút / 2h / 3h).

**Hẹn giờ chính xác trên Hobby:** dùng [cron-job.org](https://cron-job.org) gọi mỗi phút:
```
GET https://your-app.vercel.app/api/cron/process-scheduled
Authorization: Bearer <CRON_SECRET>
```

### 6. MongoDB Atlas

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
