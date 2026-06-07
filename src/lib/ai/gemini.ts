import { GoogleGenerativeAI } from "@google/generative-ai";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

function getErrorStatus(error: unknown) {
  return typeof error === 'object' && error !== null && 'status' in error ? error.status : undefined;
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "DUMMY_KEY");

export type GeneratedImage = {
  base64: string;
  mimeType: string;
  dataUrl: string;
};

export async function generateCaption(newsContent: string) {
  if (!process.env.GEMINI_API_KEY) {
    return "[MOCK] Đây là caption AI tự động soạn từ tin tức của bạn: Một bước tiến mới trong công nghệ! #AI #Innovation";
  }
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  const prompt = `
    Dựa trên nội dung tin tức ĐẶC BIỆT NÓNG HỔI sau đây, hãy viết một bản tin CỰC KỲ THU HÚT, GIẬT GÂN và GÂY CHÚ Ý để đăng lên mạng xã hội.
    Nội dung tin tức: ${newsContent}
    Yêu cầu:
    - Ngôn ngữ: Tiếng Việt, phong cách sắc sảo, kịch tính.
    - Làm nổi bật các con số (giá Vàng, Bitcoin) hoặc tình tiết quan trọng (Chiến sự, Chính trị).
    - Tạo cảm giác cấp bách hoặc tầm ảnh hưởng lớn đến người đọc.
    - Sử dụng các hashtag mạnh mẽ (#BreakingNews #KinhTe #ChienTranh #Bitcoin #Vang).
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini AI Error:", error);
    const message = getErrorMessage(error);
    const status = getErrorStatus(error);
    if (message.includes('429') || status === 429) {
      return "⚠️ [HỆ THỐNG BẬN] AI đang quá tải yêu cầu. Bạn vui lòng đợi khoảng 30-60 giây rồi nhấn thử lại nhé! (Do hạn mức tài khoản Google miễn phí đang tạm đầy)";
    }
    throw error;
  }
}

export async function generateImagePrompt(newsContent: string, title?: string) {
  if (!process.env.GEMINI_API_KEY) {
    return `Professional news illustration about: ${title || newsContent.slice(0, 100)}, cinematic lighting, editorial style, no text overlay`;
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  const prompt = `
    Dựa trên nội dung tin tức sau, hãy tạo một prompt tiếng Anh chi tiết để dùng cho AI sinh ảnh minh họa bài báo.
    Ảnh cần chuyên nghiệp, ấn tượng, phù hợp đăng mạng xã hội. Không có chữ trên ảnh.
    Tiêu đề: ${title || 'N/A'}
    Tin tức: ${newsContent}
    Chỉ trả về prompt tiếng Anh, không giải thích thêm.
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text().trim();
}

export async function generatePostImage(newsContent: string, title?: string): Promise<GeneratedImage | null> {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  const imagePrompt = await generateImagePrompt(newsContent, title);
  const imageModels = [
    'gemini-2.0-flash-exp-image-generation',
    'gemini-2.0-flash-exp',
  ];

  for (const modelName of imageModels) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          // @ts-expect-error responseModalities is supported by image-capable Gemini models
          responseModalities: ['Text', 'Image'],
        },
      });

      const result = await model.generateContent(
        `Generate a single professional news illustration image. ${imagePrompt}`
      );
      const parts = result.response.candidates?.[0]?.content?.parts ?? [];

      for (const part of parts) {
        if (part.inlineData?.data) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          return {
            base64: part.inlineData.data,
            mimeType,
            dataUrl: `data:${mimeType};base64,${part.inlineData.data}`,
          };
        }
      }
    } catch (error) {
      console.error(`Image generation failed with model ${modelName}:`, error);
    }
  }

  return null;
}

export function parseImageFromMediaUrls(mediaUrls?: string[]): GeneratedImage | null {
  if (!mediaUrls?.length) return null;

  const dataUrl = mediaUrls.find((url) => url.startsWith('data:image/'));
  if (!dataUrl) return null;

  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;

  return {
    mimeType: match[1],
    base64: match[2],
    dataUrl,
  };
}
