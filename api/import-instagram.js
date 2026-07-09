import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  const { url } = req.body;

  if (!url || !url.includes('instagram.com')) {
    return res.status(400).json({ error: '請輸入有效的 Instagram 貼文網址' });
  }

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0', // 防止被 IG 拒絕
      }
    });

    const $ = cheerio.load(html);
    const description = $('meta[property="og:description"]').attr('content') || '';
    const image = $('meta[property="og:image"]').attr('content') || '';

    return res.status(200).json({ description, image });
  } catch (err) {
    console.error('擷取失敗:', err.message);
    return res.status(500).json({ error: '無法擷取 Instagram 資訊', detail: err.message });
  }
}
