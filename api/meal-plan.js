// api/meal-plan.js — 每週餐單：GET 一星期 / POST 設定一格 / DELETE 清一格
import { Pool } from 'pg';
import { getUserId } from './_utils.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const MEALS = ['breakfast', 'lunch', 'dinner'];
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');

export default async function handler(req, res) {
  const uid = getUserId(req);
  if (!uid) return res.status(401).json({ error: 'unauthorized' });

  try {
    if (req.method === 'GET') {
      const { start } = req.query;
      if (!isDate(start)) return res.status(400).json({ error: 'invalid_input' });
      const result = await pool.query(
        `SELECT to_char(m.date, 'YYYY-MM-DD') AS date, m.meal, m.recipe_id, r.name
         FROM meal_plan m JOIN recipes r ON r.id = m.recipe_id
         WHERE m.user_id = $1 AND m.date >= $2::date AND m.date < $2::date + 7`,
        [uid, start]
      );
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      const { date, meal, recipe_id: rid } = req.body || {};
      if (!isDate(date) || !MEALS.includes(meal) || !Number.isInteger(rid)) {
        return res.status(400).json({ error: 'invalid_input' });
      }
      await pool.query(
        `INSERT INTO meal_plan (user_id, date, meal, recipe_id) VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, date, meal) DO UPDATE SET recipe_id = EXCLUDED.recipe_id`,
        [uid, date, meal, rid]
      );
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const { date, meal } = req.query;
      if (!isDate(date) || !MEALS.includes(meal)) return res.status(400).json({ error: 'invalid_input' });
      await pool.query('DELETE FROM meal_plan WHERE user_id = $1 AND date = $2 AND meal = $3', [uid, date, meal]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
}
