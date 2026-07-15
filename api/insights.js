// api/insights.js — 統計：分類分佈 + 每個食譜材料數
import { Pool } from 'pg';
import { getUserId } from './_utils.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

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

    res.status(200).json({ byCategory, ingredientCounts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
}
