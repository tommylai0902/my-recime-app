// api/insights.js — 統計：分類分佈 + 每個食譜材料數 + 營養估算
import { Pool } from 'pg';
import { getUserId } from './_utils.js';
import { askGemini } from './_gemini.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const nutritionSchema = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      id: { type: 'INTEGER', description: '食譜 id（照抄輸入）' },
      calories: { type: 'NUMBER', description: '每份卡路里 kcal' },
      protein: { type: 'NUMBER', description: '每份蛋白質（克）' },
      carbs: { type: 'NUMBER', description: '每份碳水化合物（克）' },
      fat: { type: 'NUMBER', description: '每份脂肪（克）' },
    },
    required: ['id', 'calories', 'protein', 'carbs', 'fat'],
  },
};

// 一次過批量估算未有營養數據嘅食譜，存入 DB（每個食譜只計一次）
async function backfillNutrition(uid) {
  const missing = (
    await pool.query(
      `SELECT id, name, ingredients FROM recipes
       WHERE (user_id = $1 OR user_id IS NULL) AND nutrition IS NULL LIMIT 25`,
      [uid]
    )
  ).rows;
  if (missing.length === 0) return;

  const lines = missing
    .map((r) => `id=${r.id} ${r.name}: ${[].concat(r.ingredients || []).join('、')}`)
    .join('\n');
  const est = await askGemini(
    [
      {
        text:
          '以下係食譜列表（每行一個，開頭係 id）。估算每個食譜「每一份」嘅營養：卡路里(kcal)、蛋白質/碳水化合物/脂肪（克）。id 照抄返：\n\n' +
          lines,
      },
    ],
    nutritionSchema,
    { fast: true }
  );

  const ids = new Set(missing.map((r) => r.id));
  for (const e of est) {
    if (!ids.has(e.id)) continue;
    await pool.query('UPDATE recipes SET nutrition = $2 WHERE id = $1', [
      e.id,
      JSON.stringify({ calories: e.calories, protein: e.protein, carbs: e.carbs, fat: e.fat }),
    ]);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const uid = getUserId(req);
  if (!uid) return res.status(401).json({ error: 'unauthorized' });

  try {
    const byCategory = (
      await pool.query(
        `SELECT COALESCE(NULLIF(category, ''), '') AS category, COUNT(*)::int AS count
         FROM recipes WHERE user_id = $1 OR user_id IS NULL
         GROUP BY 1 ORDER BY count DESC`,
        [uid]
      )
    ).rows;

    const ingredientCounts = (
      await pool.query(
        `SELECT name,
                CASE WHEN jsonb_typeof(ingredients) = 'array' THEN jsonb_array_length(ingredients) ELSE 1 END AS count
         FROM recipes WHERE user_id = $1 OR user_id IS NULL
         ORDER BY count DESC, name`,
        [uid]
      )
    ).rows;

    // 營養估算失敗唔好搞冧成個統計頁
    try {
      await backfillNutrition(uid);
    } catch (err) {
      console.error('nutrition backfill 失敗:', err.message);
    }
    const nutrition = (
      await pool.query(
        `SELECT name,
                (nutrition->>'calories')::numeric AS calories,
                (nutrition->>'protein')::numeric AS protein,
                (nutrition->>'carbs')::numeric AS carbs,
                (nutrition->>'fat')::numeric AS fat
         FROM recipes
         WHERE (user_id = $1 OR user_id IS NULL) AND nutrition IS NOT NULL
         ORDER BY 2 DESC`,
        [uid]
      )
    ).rows.map((r) => ({
      name: r.name,
      calories: Number(r.calories),
      protein: Number(r.protein),
      carbs: Number(r.carbs),
      fat: Number(r.fat),
    }));

    res.status(200).json({ byCategory, ingredientCounts, nutrition });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
}
