// api/import-url.js — 貼食譜網址，自動抽取食譜
// 大部分食譜網站有標準 JSON-LD（免 AI、快）；冇嘅話丟成頁文字俾 Gemini 抽
import axios from 'axios';
import * as cheerio from 'cheerio';
import { getUserId } from './_utils.js';
import { askGemini, recipeSchema, geminiError } from './_gemini.js';

const prompts = {
  zh: '以下係一個食譜網頁嘅內容。抽取出食譜，用繁體中文寫（材料連份量、簡短做法）：\n\n',
  en: 'Below is the content of a recipe web page. Extract the recipe in English (ingredients with quantities, brief steps):\n\n',
};

function fromJsonLd($) {
  let recipe = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (recipe) return;
    try {
      const data = JSON.parse($(el).contents().text());
      const nodes = [].concat(data['@graph'] || data);
      for (const n of nodes) {
        if ([].concat(n['@type'] || []).includes('Recipe')) {
          recipe = n;
          return;
        }
      }
    } catch {}
  });
  if (!recipe) return null;
  const ingredients = [].concat(recipe.recipeIngredient || recipe.ingredients || []);
  if (!recipe.name || ingredients.length === 0) return null;
  const steps = [].concat(recipe.recipeInstructions || [])
    .map((s) =>
      typeof s === 'string' ? s : s.text || [].concat(s.itemListElement || []).map((e) => e.text).join(' ')
    )
    .filter(Boolean)
    .join(' ');
  return {
    name: recipe.name,
    category: [].concat(recipe.recipeCategory || [])[0] || '',
    ingredients,
    description: [recipe.description, steps].filter(Boolean).join(' ').slice(0, 3000),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!getUserId(req)) return res.status(401).json({ error: 'unauthorized' });

  const { url, lang } = req.body || {};
  if (!url || !/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'invalid_url' });

  let html;
  try {
    const r = await axios.get(url, {
      // IG/FB 只將 og:description（貼文 caption）開放俾 link-preview crawler
      headers: { 'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' },
      timeout: 10000,
      maxContentLength: 5 * 1024 * 1024,
    });
    html = r.data;
  } catch (err) {
    console.error('fetch 失敗:', err.message);
    return res.status(422).json({ error: 'fetch_failed' });
  }

  const $ = cheerio.load(typeof html === 'string' ? html : '');
  const ld = fromJsonLd($);
  if (ld) return res.status(200).json(ld);

  // fallback：抽頁面文字俾 Gemini — og:description 行先（IG caption 喺呢度），body 文字跟尾
  const title = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
  const og = $('meta[property="og:description"]').attr('content') || '';
  const body = $('body').text().replace(/\s+/g, ' ');
  // 攞唔到有用內容（例如被封鎖淨返個空殼）就直接俾明確錯誤，唔好等 AI 老作
  if ((og + body).replace(/\s+/g, '').length < 100) {
    return res.status(422).json({ error: 'fetch_failed' });
  }
  const text = [title, og, body].filter(Boolean).join('\n').slice(0, 15000);

  try {
    const recipe = await askGemini([{ text: (prompts[lang] || prompts.zh) + text }], recipeSchema);
    res.status(200).json(recipe);
  } catch (err) {
    geminiError(res, err, 'gemini_failed');
  }
}
