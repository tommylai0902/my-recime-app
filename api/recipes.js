import { Pool } from 'pg';
import { getUserId } from './_utils.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  const uid = getUserId(req);
  if (!uid) return res.status(401).json({ error: 'unauthorized' });

  if (req.method === 'GET') {
    // user_id IS NULL = 登入功能之前嘅舊食譜，全部人都見到
    const result = await pool.query(
      'SELECT * FROM recipes WHERE user_id = $1 OR user_id IS NULL ORDER BY id DESC',
      [uid]
    );
    res.status(200).json(result.rows.map(row => {
      let ingredients = row.ingredients;
      if (typeof ingredients === 'string') {
        try {
          ingredients = JSON.parse(ingredients);
        } catch {
          ingredients = [ingredients]; // 不合法 JSON 直接包成陣列
        }
      }
      return { ...row, ingredients };
    }));
    return;
  }

  if (req.method === 'POST') {
    const { name, description, image, ingredients, url, category } = req.body;
    if (!name || !description || !ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      res.status(400).json({ error: '名稱、描述和原料為必填項，且原料必須為非空陣列' });
      return;
    }
    const result = await pool.query(
      `INSERT INTO recipes (name, description, image, ingredients, url, category, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, description, image, JSON.stringify(ingredients), url, category, uid]
    );
    res.status(201).json(result.rows[0]);
    return;
  }

  res.status(405).json({ error: 'Method Not Allowed' });
}
