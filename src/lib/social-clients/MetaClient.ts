export class MetaClient {
  private accessToken: string;
  private version = 'v20.0';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async postToFacebookPage(pageId: string, message: string, link?: string) {
    const url = `https://graph.facebook.com/${this.version}/${pageId}/feed`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        link,
        access_token: this.accessToken,
      }),
    });
    return response.json();
  }

  async postToInstagram(igUserId: string, imageUrl: string, caption: string) {
    // Bước 1: Tạo media container
    const mediaUrl = `https://graph.facebook.com/${this.version}/${igUserId}/media`;
    const mediaRes = await fetch(mediaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: this.accessToken,
      }),
    });
    const { id: creationId } = await mediaRes.json();

    // Bước 2: Publish media
    const publishUrl = `https://graph.facebook.com/${this.version}/${igUserId}/media_publish`;
    const publishRes = await fetch(publishUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: this.accessToken,
      }),
    });
    return publishRes.json();
  }
}
