// api/scan-dish.js — 影一張餸相，Gemini 認出係咩菜並出食譜
import { getUserId } from './_utils.js';
import { askGemini, recipeSchema, geminiError } from './_gemini.js';

const prompts = {
  zh: '認出呢張相入面嘅菜式，然後用繁體中文寫出佢嘅食譜（材料連份量、簡短做法）。',
  en: 'Identify the dish in this photo, then write its recipe in English (ingredients with quantities, brief steps).',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!getUserId(req)) return res.status(401).json({ error: 'unauthorized' });

  const { image, media_type: mediaType, lang } = req.body || {};
  if (!image) return res.status(400).json({ error: 'missing_image' });

  try {
    const recipe = await askGemini(
      [
        { inline_data: { mime_type: mediaType || 'image/jpeg', data: image } },
        { text: prompts[lang] || prompts.zh },
      ],
      recipeSchema
    );
    res.status(200).json(recipe);
  } catch (err) {
    geminiError(res, err, 'scan_failed');
  }
}
