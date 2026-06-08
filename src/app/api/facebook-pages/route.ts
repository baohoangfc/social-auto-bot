import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { FacebookPage } from '@/models';

export const dynamic = 'force-dynamic';

type PagePayload = {
  _id?: string;
  pageId?: string;
  pageName?: string;
  pageAccessToken?: string;
  tokenExpiresAt?: string | null;
  profilePicture?: string;
  category?: string;
  isActive?: boolean;
  contentProfile?: {
    topic?: string;
    tone?: string;
    language?: string;
    prompt?: string;
    hashtags?: string[] | string;
    sourceIds?: string[];
  };
  postingSettings?: {
    autoPost?: boolean;
    requireApproval?: boolean;
    defaultScheduleTimes?: string[];
  };
};

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim());
  }
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function buildPageUpdate(payload: PagePayload) {
  return {
    pageId: payload.pageId?.trim(),
    pageName: payload.pageName?.trim(),
    pageAccessToken: payload.pageAccessToken?.trim(),
    tokenExpiresAt: payload.tokenExpiresAt ? new Date(payload.tokenExpiresAt) : undefined,
    profilePicture: payload.profilePicture?.trim(),
    category: payload.category?.trim(),
    isActive: payload.isActive ?? true,
    contentProfile: {
      topic: payload.contentProfile?.topic?.trim() || '',
      tone: payload.contentProfile?.tone?.trim() || 'Chuyên nghiệp, rõ ràng, thu hút',
      language: payload.contentProfile?.language?.trim() || 'Tiếng Việt',
      prompt: payload.contentProfile?.prompt?.trim() || '',
      hashtags: normalizeStringArray(payload.contentProfile?.hashtags),
      sourceIds: normalizeStringArray(payload.contentProfile?.sourceIds),
    },
    postingSettings: {
      autoPost: payload.postingSettings?.autoPost ?? false,
      requireApproval: payload.postingSettings?.requireApproval ?? true,
      defaultScheduleTimes: normalizeStringArray(payload.postingSettings?.defaultScheduleTimes),
    },
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export async function GET() {
  try {
    await connectDB();
    const pages = await FacebookPage.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, pages });
  } catch (error) {
    console.error('Facebook Pages GET Error:', error);
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const payload = (await req.json()) as PagePayload;
    const update = buildPageUpdate(payload);

    if (!update.pageId || !update.pageName || !update.pageAccessToken) {
      return NextResponse.json({ success: false, error: 'pageId, pageName và pageAccessToken là bắt buộc' }, { status: 400 });
    }

    const page = await FacebookPage.findOneAndUpdate(
      { pageId: update.pageId },
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    );

    return NextResponse.json({ success: true, page });
  } catch (error) {
    console.error('Facebook Pages POST Error:', error);
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await connectDB();
    const payload = (await req.json()) as PagePayload;
    if (!payload._id && !payload.pageId) {
      return NextResponse.json({ success: false, error: 'Cần _id hoặc pageId để cập nhật Page' }, { status: 400 });
    }

    const update = buildPageUpdate(payload);
    const page = await FacebookPage.findOneAndUpdate(
      payload._id ? { _id: payload._id } : { pageId: payload.pageId },
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!page) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy Facebook Page' }, { status: 404 });
    }

    return NextResponse.json({ success: true, page });
  } catch (error) {
    console.error('Facebook Pages PATCH Error:', error);
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const pageId = searchParams.get('pageId');

    if (!id && !pageId) {
      return NextResponse.json({ success: false, error: 'Cần id hoặc pageId để xóa Page' }, { status: 400 });
    }

    const page = await FacebookPage.findOneAndDelete(id ? { _id: id } : { pageId });
    if (!page) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy Facebook Page' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Facebook Pages DELETE Error:', error);
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}
