// api/recipe-nutrition.js — 單一食譜嘅 per-serving 營養估算（有就直接讀，冇先叫 AI 計）
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
    calories: { type: 'NUMBER', description: '每份卡路里 kcal' },
    protein: { type: 'NUMBER', description: '每份蛋白質（克）' },
    carbs: { type: 'NUMBER', description: '每份碳水化合物（克）' },
    fat: { type: 'NUMBER', description: '每份脂肪（克）' },
  },
  required: ['calories', 'protein', 'carbs', 'fat'],
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const uid = getUserId(req);
  if (!uid) return res.status(401).json({ error: 'unauthorized' });

  const id = parseInt(req.body?.id);
  if (isNaN(id)) return res.status(400).json({ error: 'invalid_input' });

  try {
    const r = await pool.query(
      'SELECT id, name, ingredients, nutrition FROM recipes WHERE id = $1 AND user_id = $2',
      [id, uid]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'not_found' });
    const row = r.rows[0];
    if (row.nutrition) return res.status(200).json(row.nutrition);

    const est = await askGemini(
      [
        {
          text:
            '估算呢個食譜「每一份」嘅營養：卡路里(kcal)、蛋白質/碳水化合物/脂肪（克）：\n\n' +
            `${row.name}: ${[].concat(row.ingredients || []).join('、')}`,
        },
      ],
      schema,
      { fast: true }
    );
    await pool.query('UPDATE recipes SET nutrition = $2 WHERE id = $1', [id, JSON.stringify(est)]);
    res.status(200).json(est);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
}
