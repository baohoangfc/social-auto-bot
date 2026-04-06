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
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Cải tiến selector để đọc được đa dạng các trang báo quốc tế (BBC, CNN, Al Jazeera, CoinDesk, v.v.)
    const title = $('h1').text().trim();
    const content = $('article, .article-content, .content, main, .story-body, .at-body, .at-paragraph, .ssrcss-11r1m41-RichTextComponent').text().trim();

    if (!title || !content) {
      console.error(`Scraper failed for URL: ${url}. Title: ${!!title}, Content: ${!!content}`);
      throw new Error('Không thể trích xuất nội dung từ bài báo này. Trang web có thể đã chặn bot hoặc cấu trúc trang đã thay đổi.');
    }

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
