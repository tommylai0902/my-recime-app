// api/shopping-list.js — 揀幾個食譜，合併材料再按超市走道分類
import { Pool } from 'pg';
import { getUserId } from './_utils.js';
import { askGemini, geminiError } from './_gemini.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const listSchema = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      aisle: { type: 'STRING', description: '超市走道分類名' },
      items: { type: 'ARRAY', items: { type: 'STRING' }, description: '材料連合併後份量' },
    },
    required: ['aisle', 'items'],
  },
};

const prompts = {
  zh: '以下係幾個食譜嘅材料。幫我合併成一張購物清單：相同材料合併埋一齊（份量加埋），按超市走道分類（蔬果、肉類海鮮、雪櫃乳製品、急凍、罐頭乾貨、調味料、其他）。用繁體中文：\n\n',
  en: 'Below are ingredients from several recipes. Merge them into one shopping list: combine duplicate items (sum the quantities) and group by supermarket aisle (Produce, Meat & Seafood, Dairy & Chilled, Frozen, Pantry, Condiments & Spices, Other). In English:\n\n',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const uid = getUserId(req);
  if (!uid) return res.status(401).json({ error: 'unauthorized' });

  const { recipe_ids: ids, lang } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every(Number.isInteger)) {
    return res.status(400).json({ error: 'invalid_input' });
  }

  const result = await pool.query(
    'SELECT name, ingredients FROM recipes WHERE id = ANY($1) AND (user_id = $2 OR user_id IS NULL)',
    [ids, uid]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'invalid_input' });

  const lines = result.rows
    .map((row) => {
      let ing = row.ingredients;
      if (typeof ing === 'string') {
        try {
          ing = JSON.parse(ing);
        } catch {
          ing = [ing];
        }
      }
      return `${row.name}: ${[].concat(ing).join('、')}`;
    })
    .join('\n');

  try {
    const list = await askGemini([{ text: (prompts[lang] || prompts.zh) + lines }], listSchema, { fast: true });
    res.status(200).json(list);
  } catch (err) {
    geminiError(res, err, 'list_failed');
  }
}
