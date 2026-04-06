export class MetaClient {
  private version = 'v20.0';

  async postToFacebookPage(pageId: string, pageAccessToken: string, message: string, link?: string) {
    const url = `https://graph.facebook.com/${this.version}/${pageId}/feed`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        link,
        access_token: pageAccessToken,
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error('Meta API Error (FB Page):', data.error);
      throw new Error(`Facebook API Error: ${data.error.message}`);
    }
    return data;
  }

  async postToInstagram(igUserId: string, accessToken: string, imageUrl: string, caption: string) {
    // ... (logic from before)
    const mediaUrl = `https://graph.facebook.com/${this.version}/${igUserId}/media`;
    const mediaRes = await fetch(mediaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: accessToken,
      }),
    });
    const { id: creationId } = await mediaRes.json();

    const publishUrl = `https://graph.facebook.com/${this.version}/${igUserId}/media_publish`;
    const publishRes = await fetch(publishUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: accessToken,
      }),
    });
    return publishRes.json();
  }
}
