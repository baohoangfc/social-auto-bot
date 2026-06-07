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

  async postPhotoToFacebookPage(
    pageId: string,
    pageAccessToken: string,
    message: string,
    imageBuffer: Buffer,
    mimeType = 'image/png',
    link?: string
  ) {
    const formData = new FormData();
    const caption = link ? `${message}\n\n${link}` : message;
    formData.append('message', caption);
    formData.append('access_token', pageAccessToken);
    formData.append('source', new Blob([new Uint8Array(imageBuffer)], { type: mimeType }), 'post-image.png');

    const url = `https://graph.facebook.com/${this.version}/${pageId}/photos`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (data.error) {
      console.error('Meta API Error (FB Photo):', data.error);
      throw new Error(`Facebook API Error: ${data.error.message}`);
    }
    return data;
  }

  async postToInstagram(igUserId: string, accessToken: string, imageUrl: string, caption: string) {
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
    const mediaData = await mediaRes.json();
    if (mediaData.error) {
      throw new Error(`Instagram API Error: ${mediaData.error.message}`);
    }

    const { id: creationId } = mediaData;
    if (!creationId) {
      throw new Error('Instagram API Error: missing creation id');
    }

    const publishUrl = `https://graph.facebook.com/${this.version}/${igUserId}/media_publish`;
    const publishRes = await fetch(publishUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: accessToken,
      }),
    });
    const publishData = await publishRes.json();
    if (publishData.error) {
      throw new Error(`Instagram API Error: ${publishData.error.message}`);
    }
    return publishData;
  }
}
