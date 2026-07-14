// api/import-url.js — 貼食譜網址，自動抽取食譜
// 大部分食譜網站有標準 JSON-LD（免 AI、快）；冇嘅話丟頁面文字俾 Gemini 抽
// ponytail: 用 fetch + regex，唔用 axios/cheerio（嗰兩個喺 Vercel runtime 載入會 crash）
import { getUserId } from './_utils.js';
import { askGemini, recipeSchema, geminiError } from './_gemini.js';

const prompts = {
  zh: '以下係一個食譜網頁嘅內容。抽取出食譜，用繁體中文寫（材料連份量、簡短做法）：\n\n',
  en: 'Below is the content of a recipe web page. Extract the recipe in English (ingredients with quantities, brief steps):\n\n',
};

const decode = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/gi, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));

function metaContent(html, prop) {
  const tag = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i'));
  const c = tag && tag[0].match(/content=["']([^"']*)["']/i);
  return c ? decode(c[1]) : '';
}

function fromJsonLd(html) {
  for (const [, raw] of html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )) {
    try {
      const data = JSON.parse(raw.trim());
      const nodes = [].concat(data['@graph'] || data);
      for (const n of nodes) {
        if (![].concat(n['@type'] || []).includes('Recipe')) continue;
        const ingredients = [].concat(n.recipeIngredient || n.ingredients || []);
        if (!n.name || ingredients.length === 0) continue;
        const steps = [].concat(n.recipeInstructions || [])
          .map((s) =>
            typeof s === 'string' ? s : s.text || [].concat(s.itemListElement || []).map((e) => e.text).join(' ')
          )
          .filter(Boolean)
          .join(' ');
        return {
          name: decode(n.name),
          category: [].concat(n.recipeCategory || [])[0] || '',
          ingredients: ingredients.map(decode),
          description: decode([n.description, steps].filter(Boolean).join(' ')).slice(0, 3000),
        };
      }
    } catch {}
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!getUserId(req)) return res.status(401).json({ error: 'unauthorized' });

  const { url, lang } = req.body || {};
  if (!url || !/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'invalid_url' });

  let html;
  try {
    const r = await fetch(url, {
      // IG/FB 只將 og:description（貼文 caption）開放俾 link-preview crawler
      headers: { 'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    html = await r.text();
  } catch (err) {
    console.error('fetch 失敗:', err.message);
    return res.status(422).json({ error: 'fetch_failed' });
  }

  const ld = fromJsonLd(html);
  if (ld) return res.status(200).json(ld);

  // fallback：抽頁面文字俾 Gemini — og:description 行先（IG caption 喺呢度），body 文字跟尾
  const title = metaContent(html, 'og:title') || (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  const og = metaContent(html, 'og:description');
  const body = decode(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  ).replace(/\s+/g, ' ');
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
