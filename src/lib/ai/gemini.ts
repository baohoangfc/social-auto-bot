import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "DUMMY_KEY");

export async function generateCaption(newsContent: string) {
  if (!process.env.GEMINI_API_KEY) {
    return "[MOCK] Đây là caption AI tự động soạn từ tin tức của bạn: Một bước tiến mới trong công nghệ! #AI #Innovation";
  }
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
    Dựa trên nội dung tin tức sau đây, hãy viết một caption thu hút để đăng lên mạng xã hội (Facebook/Instagram/X).
    Nội dung tin tức: ${newsContent}
    Yêu cầu:
    - Ngôn ngữ: Tiếng Việt
    - Phong cách: Hấp dẫn, ngắn gọn, có sử dụng hashtag phù hợp.
    - Không bao gồm các từ nhạy cảm hoặc vi phạm chính sách.
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

export async function generateImagePrompt(newsContent: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
    Dựa trên nội dung tin tức sau, hãy tạo một prompt tiếng Anh chi tiết để dùng cho AI sinh ảnh (DALL-E/Midjourney).
    Ảnh cần minh họa cho tin tức một cách chuyên nghiệp và ấn tượng.
    Tin tức: ${newsContent}
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}
