export class XClient {
  private bearerToken: string;

  constructor(bearerToken: string) {
    this.bearerToken = bearerToken;
  }

  async postTweet(text: string) {
    const url = 'https://api.twitter.com/2/tweets';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
    return response.json();
  }
}
