import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "DUMMY_KEY");

export async function generateCaption(newsContent: string) {
  if (!process.env.GEMINI_API_KEY) {
    return "[MOCK] Đây là caption AI tự động soạn từ tin tức của bạn: Một bước tiến mới trong công nghệ! #AI #Innovation";
  }
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
    Dựa trên nội dung tin tức ĐẶC BIỆT NÓNG HỔI sau đây, hãy viết một bản tin CỰC KỲ THU HÚT, GIẬT GÂN và GÂY CHÚ Ý để đăng lên mạng xã hội.
    Nội dung tin tức: ${newsContent}
    Yêu cầu:
    - Ngôn ngữ: Tiếng Việt, phong cách sắc sảo, kịch tính.
    - Làm nổi bật các con số (giá Vàng, Bitcoin) hoặc tình tiết quan trọng (Chiến sự, Chính trị).
    - Tạo cảm giác cấp bách hoặc tầm ảnh hưởng lớn đến người đọc.
    - Sử dụng các hashtag mạnh mẽ (#BreakingNews #KinhTe #ChienTranh #Bitcoin #Vang).
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
