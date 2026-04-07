import OAuth from 'oauth-1.0a';
import crypto from 'crypto-js';

export class XClient {
  private consumerKey: string;
  private consumerSecret: string;
  private accessToken: string;
  private accessSecret: string;

  constructor(consumerKey: string, consumerSecret: string, accessToken: string, accessSecret: string) {
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;
    this.accessToken = accessToken;
    this.accessSecret = accessSecret;
  }

  async postTweet(text: string) {
    const oauth = new OAuth({
      consumer: { key: this.consumerKey, secret: this.consumerSecret },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string, key) {
        return crypto.HmacSHA1(base_string, key).toString(crypto.enc.Base64);
      },
    });

    const request_data = {
      url: 'https://api.twitter.com/2/tweets',
      method: 'POST',
      data: { text },
    };

    const token = {
      key: this.accessToken,
      secret: this.accessSecret,
    };

    const headers = oauth.toHeader(oauth.authorize(request_data, token));

    const response = await fetch(request_data.url, {
      method: request_data.method,
      headers: {
        ...headers as any,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request_data.data),
    });

    const resData = await response.json();
    if (!response.ok) {
      console.error('X API Error:', resData);
      throw new Error(`X API Error: ${resData.detail || resData.message || response.statusText}`);
    }
    return resData;
  }
}
