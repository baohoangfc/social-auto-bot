import Parser from 'rss-parser';
import * as cheerio from 'cheerio';

const parser = new Parser();

export async function fetchRSS(url: string) {
  try {
    const feed = await parser.parseURL(url);
    return feed.items.map(item => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      content: item.contentSnippet || item.content,
    }));
  } catch (error) {
    console.error('Error fetching RSS:', error);
    return [];
  }
}

export async function scrapeNews(url: string) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Đây là logic đơn giản, thực tế cần tùy chỉnh cho từng trang báo
    const title = $('h1').text().trim();
    const content = $('article, .article-content, .content').text().trim();

    return {
      title,
      content: content.slice(0, 1000), // Giới hạn độ dài để gửi cho AI
      url
    };
  } catch (error) {
    console.error('Error scraping news:', error);
    return null;
  }
}
