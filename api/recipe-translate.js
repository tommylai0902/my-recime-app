// api/recipe-translate.js — 將食譜嘅名/做法/材料翻譯做另一種語言（中↔英），有就直接讀，冇先至叫AI
import { Pool } from 'pg';
import { getUserId } from './_utils.js';
import { askGemini } from './_gemini.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const schema = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING', description: '翻譯後嘅食譜名稱' },
    description: { type: 'STRING', description: '翻譯後嘅做法，每個步驟自成一行' },
    ingredients: { type: 'ARRAY', items: { type: 'STRING' }, description: '翻譯後嘅材料清單，份量單位維持原樣' },
  },
  required: ['name', 'description', 'ingredients'],
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const uid = getUserId(req);
  if (!uid) return res.status(401).json({ error: 'unauthorized' });

  const id = parseInt(req.body?.id);
  if (isNaN(id)) return res.status(400).json({ error: 'invalid_input' });

  try {
    const r = await pool.query(
      'SELECT id, name, description, ingredients, translation FROM recipes WHERE id = $1 AND user_id = $2',
      [id, uid]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'not_found' });
    const row = r.rows[0];
    if (row.translation) return res.status(200).json(row.translation);

    // 原文有中文字就譯做英文，否則譯做中文
    const targetLang = /[一-鿿]/.test(row.name) ? 'English' : 'Traditional Chinese (Cantonese wording)';
    const translated = await askGemini(
      [
        {
          text:
            `Translate this recipe's name and steps into ${targetLang}. For each ingredient, translate ONLY the food/item name and keep the numeric quantity and unit unchanged ` +
            `(e.g. "雞胸肉 200克" -> "chicken breast 200g", "chicken breast 200g" -> "雞胸肉 200克") — every ingredient must end up with translated wording, do not leave any ingredient in the original language:\n\n` +
            `Name: ${row.name}\n\nSteps: ${row.description}\n\nIngredients: ${[].concat(row.ingredients || []).join('; ')}`,
        },
      ],
      schema,
      { fast: true }
    );
    await pool.query('UPDATE recipes SET translation = $2 WHERE id = $1', [id, JSON.stringify(translated)]);
    res.status(200).json(translated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
}
