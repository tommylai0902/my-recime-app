// api/scan-dish.js — 影一張餸相，Gemini 認出係咩菜並出食譜（免費 tier）
import { getUserId } from './_utils.js';

const schema = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING', description: '菜式名稱' },
    category: { type: 'STRING', description: '分類，例如 中式/意式/日式' },
    ingredients: { type: 'ARRAY', items: { type: 'STRING' }, description: '材料清單，每項包含份量' },
    description: { type: 'STRING', description: '簡介 + 簡短做法步驟' },
  },
  required: ['name', 'category', 'ingredients', 'description'],
};

const prompts = {
  zh: '認出呢張相入面嘅菜式，然後用繁體中文寫出佢嘅食譜（材料連份量、簡短做法）。',
  en: 'Identify the dish in this photo, then write its recipe in English (ingredients with quantities, brief steps).',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!getUserId(req)) return res.status(401).json({ error: 'unauthorized' });

  const { image, media_type: mediaType, lang } = req.body || {};
  if (!image) return res.status(400).json({ error: 'missing_image' });

  // ponytail: 免費 tier 個別模型會塞車（503）/退役（404），順序試落去
  const models = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite'];

  try {
    let r;
    for (const model of models) {
      r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-goog-api-key': process.env.GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { inline_data: { mime_type: mediaType || 'image/jpeg', data: image } },
                  { text: prompts[lang] || prompts.zh },
                ],
              },
            ],
            generationConfig: { responseMimeType: 'application/json', responseSchema: schema },
          }),
        }
      );
      if (r.ok) break;
      console.error(model, r.status, await r.text());
      if (![404, 429, 503].includes(r.status)) break; // 其他錯誤唔使再試
    }
    if (!r.ok) {
      return res.status(r.status === 429 || r.status === 503 ? 429 : 500).json({
        error: r.status === 429 || r.status === 503 ? 'busy' : 'scan_failed',
      });
    }
    const data = await r.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return res.status(422).json({ error: 'unrecognized' });
    res.status(200).json(JSON.parse(text));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'scan_failed', detail: err.message });
  }
}
