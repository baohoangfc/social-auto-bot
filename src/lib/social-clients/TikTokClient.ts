export class TikTokClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async postVideo(videoUrl: string, title: string) {
    // Lưu ý: TikTok Content Posting API yêu cầu nhiều bước (init, upload, check)
    // Đây là phiên bản đơn giản hóa gọi endpoint chia sẻ
    const url = 'https://open.tiktokapis.com/v2/post/publish/video/self/init/';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        post_info: {
          title,
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          video_ad_tag: false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: videoUrl,
        },
      }),
    });
    return response.json();
  }
}
