// api/import-url.js — 貼食譜網址，自動抽取食譜
// 大部分食譜網站有標準 JSON-LD（免 AI、快）；冇嘅話丟頁面文字俾 Gemini 抽
// ponytail: 用 fetch + regex，唔用 axios/cheerio（嗰兩個喺 Vercel runtime 載入會 crash）
import { getUserId } from './_utils.js';
import { askGemini, recipeSchema, geminiError } from './_gemini.js';

const prompts = {
  zh: '以下係一個食譜網頁嘅內容。抽取出食譜，用繁體中文寫（材料連份量、簡短做法 — 每個步驟自成一行）：\n\n',
  en: 'Below is the content of a recipe web page. Extract the recipe in English (ingredients with quantities, brief steps — one step per line):\n\n',
};

const decode = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))) // 韓文等非拉丁字多數用 hex entity
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

function metaContent(html, prop) {
  const tag = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i'));
  const c = tag && tag[0].match(/content=["']([^"']*)["']/i);
  return c ? decode(c[1]) : '';
}

// IG caption 本身已經寫晒材料同步驟嘅話，直接用原文，唔使 AI
function parseCaptionRecipe(og) {
  // IG og:description 格式：`995K likes, 123 comments - user on Jan 1: "caption內文"`
  const text = og.replace(/^[^"“]*["“]\s*/, '').replace(/["”]\s*$/, '');
  const rawLines = text.split('\n').map((s) => s.trim()).filter(Boolean);
  if (rawLines.length < 5) return null;

  const isItem = (l) => /^[-•*]\s*\S/.test(l) || /^\d+[.)]\s*\S/.test(l);

  // 斬做一節節：非列點行 = 小標題（例如 ingredients / Seasoning / Recipe）
  const sections = [];
  let cur = { header: '', items: [] };
  for (const l of rawLines) {
    if (isItem(l)) {
      cur.items.push(l);
    } else {
      if (cur.header || cur.items.length) sections.push(cur);
      cur = { header: l, items: [] };
    }
  }
  if (cur.header || cur.items.length) sections.push(cur);

  const stripMark = (l) => l.replace(/^[-•*]\s*/, '');
  const ingRe = /ingredient|材料|食材|재료/i;
  const ingHeader = sections.findIndex((s) => ingRe.test(s.header) && s.items.length >= 3);

  if (ingHeader !== -1) {
    // 有「ingredients」小標題：淨攞嗰節做材料，之後全部節（連小標題）保留做描述
    const ingredients = sections[ingHeader].items.map(stripMark);
    // 再撞到另一個 ingredients 標題 = 另一語言版本重新開始，喺度截斷
    let rest = sections.slice(ingHeader + 1);
    const dupIdx = rest.findIndex((s) => ingRe.test(s.header));
    if (dupIdx !== -1) rest = rest.slice(0, dupIdx);
    const stepSections = rest.filter((s) => s.items.length);
    if (stepSections.reduce((n, s) => n + s.items.length, 0) < 2) return null;
    const description = stepSections
      .map((s) =>
        [s.header, ...s.items.map((l) => l.replace(/^[-•*]\s*/, '• '))].filter(Boolean).join('\n')
      )
      .join('\n\n');
    const nameSec = sections.slice(0, ingHeader).find((s) => s.header && !s.items.length);
    const name = ((nameSec && nameSec.header) || rawLines[0]).replace(/[#@].*$/, '').trim().slice(0, 80);
    return { name, category: '', ingredients, description };
  }

  // 冇小標題：舊式簡單格式 — 列點 = 材料、編號 = 步驟
  const ingredients = rawLines.filter((l) => /^[-•*]\s*\S/.test(l)).map(stripMark);
  const steps = rawLines.filter((l) => /^\d+[.)]\s*\S/.test(l));
  if (ingredients.length < 3 || steps.length < 2) return null; // 唔似完整食譜，交返俾 AI
  return {
    name: (rawLines[0] || '').replace(/[#@].*$/, '').trim().slice(0, 80),
    category: '',
    ingredients,
    description: steps.join('\n'),
  };
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

  const t0 = Date.now();
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

  // caption 已經係完整食譜 → 直接用原文（即時、零 AI、保留原作者寫法）
  if (og) {
    const parsed = parseCaptionRecipe(og);
    if (parsed) return res.status(200).json(parsed);
  }
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

  const t1 = Date.now();
  try {
    const recipe = await askGemini([{ text: (prompts[lang] || prompts.zh) + text }], recipeSchema, { fast: true });
    res.status(200).json({ ...recipe, _ms: { fetch: t1 - t0, ai: Date.now() - t1 } });
  } catch (err) {
    geminiError(res, err, 'gemini_failed');
  }
}
